# Product Requirements Document (PRD) — Mastra-Copilot SSE Streaming (`prd-mastra-copilot-sse`)

## 1. Overview & Success Metrics

To provide a state-of-the-art interactive user experience, the Multi-Asset Autonomous Paywall Optimizer (APO) requires streaming reasoning steps and paywall layout proposal updates in real-time. Instead of waiting for the full LLM completion block (which takes seconds), the **Copilot Bridge** and **Mastra AI Service** will communicate via **Server-Sent Events (SSE)**. This allows the growth manager to observe Gemma's step-by-step thinking (e.g., retrieving memory, semantic analysis, drafting variant parameters) as it happens.

### Success Metrics
*   **Business KPIs**:
    *   **User Engagement**: 100% of reasoning audit sessions display real-time text generation, reducing user bounce rates or perceived hangs during AI analysis.
    *   **Trust & Transparency**: Real-time logging of tool executions (e.g. database vector search, Ollama retrieval) increases user trust in the AI's decisions.
*   **Technical KPIs**:
    *   **Time to First Token (TTFT)**: $\le 200\text{ms}$ at 95th percentile from the moment the user triggers an audit.
    *   **Stream Reliability**: Zero dangling or orphaned streams on connection close. 100% cleanup of Ollama processes on client aborts.
    *   **Latency Overhead**: SSE chunk processing overhead in `copilot-bridge` must be $\le 10\text{ms}$ per chunk.

---

## 2. User Stories

*   **Streaming Reasoning Logs**: As a growth manager, when I ask Gemma to optimize an app's paywall layout, I want to see the agent's reasoning steps and status logs (e.g., *"Searching history memory..."*, *"Analyzing control metrics..."*) stream in real-time in my Copilot sidebar.
*   **Streaming UI Building**: As a growth manager, I want to watch the generative UI proposal cards update dynamically as parts of the layout schema are proposed, rather than waiting for the entire proposal to compile.
*   **Instant Interruption**: As a growth manager, if I close the sidebar or input a new query while a proposal is streaming, I want the backend LLM generation to stop immediately to conserve server resources.

---

## 3. Technical Constraints & Domain Modeling

### Microservices & Interactions
*   **Mastra AI Endpoint**: Exposes a POST route `POST /api/reasoning/mutate/stream` returning `text/event-stream`.
*   **Copilot Bridge Gateway**: Consumes the Mastra SSE stream using a readable stream, wrapping the chunks into the CopilotKit stream protocol using `@copilotkit/runtime`'s native streaming support, and returns it to the client via its `/copilot/chat` WebSocket/HTTP connection.
*   **Resource Management**: Implements downstream cancellation propagation using an `AbortController`. If a client aborts the request, the `copilot-bridge` aborts its fetch call to `mastra-ai`, and `mastra-ai` signals Ollama to stop generation.

### Core Domain Layer

#### Value Objects (`src/domain/types.ts`)
*   `ReasoningChunk`: Encapsulates a slice of the streamed LLM text token, or a status update.
    ```typescript
    type ChunkType = 'token' | 'status' | 'mutation_update' | 'error';
    interface ReasoningChunk {
      type: ChunkType;
      content: string;
      timestamp: number;
    }
    ```

#### Domain Events (`src/domain/events.ts`)
*   `ReasoningStreamStarted`: Fired when the agent begins stream assembly.
*   `ReasoningStreamEnded`: Fired when the agent completes proposal streaming.

### Application Layer / Use Cases
*   `StreamRemediationProposal`: Handles stream orchestration. Accepts `appId` and `metrics`, requests the stream from the reasoning client port, processes chunks, and pipes them to the application output stream.
*   **Ports (Interfaces)**:
    *   `StreamingReasoningClient`: Port interface defining `generateMutationStream(appId: string, metrics: TelemetryMetrics, signal: AbortSignal): Promise<ReadableStream<ReasoningChunk>>`.

### Infrastructure Layer & Adapters
*   **`MastraStreamingAdapter`**: Implements `StreamingReasoningClient` using Hono's `hono/streaming` helper to yield SSE lines.
*   **`FetchStreamAdapter`**: Implements reading the `text/event-stream` using the standard `ReadableStream` reader interface, parsing chunk data line-by-line, and injecting correlation context.

### Hexagonal Architecture Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             INFRASTRUCTURE LAYER                            │
│                                                                             │
│   ┌───────────────┐              ┌─────────────────────────────┐            │
│   │ React Frontend│◄──WebSocket──│   CopilotBridge Server      │            │
│   └───────────────┘              └──────────────┬──────────────┘            │
│                                                 │                           │
│                                                 │ Fetch SSE / POST stream   │
│                                                 ▼                           │
│   ┌────────────────────────────────────────────────────────────┐            │
│   │                      APPLICATION LAYER                      │            │
│   │                                                            │            │
│   │  ┌───────────────────────────────┐                          │            │
│   │  │   StreamRemediationProposal   │                          │            │
│   │  └──────────────┬────────────────┘                          │            │
│   │                 │                                           │            │
│   │                 ▼                                           │            │
│   │     [StreamingReasoningClient Port]                         │            │
│   │                                                             │            │
│   │  ┌──────────────────────────────────────────────────────┐   │            │
│   │  │                     DOMAIN LAYER                     │   │            │
│   │  │                                                      │   │            │
│   │  │   Value Objects: ReasoningChunk, ChunkType           │   │            │
│   │  │   Domain Events: ReasoningStreamStarted/Ended        │   │            │
│   │  └──────────────────────────────────────────────────────┘   │            │
│   └────────────────────────────────────────────────────────────┘            │
│                                                 │                           │
│                                                 ▼                           │
│   ┌────────────────────────────────────────────────────────────┐            │
│   │                 MASTRA-AI INFRASTRUCTURE LAYER             │            │
│   │                                                            │            │
│   │  ┌───────────────────────────────┐   ┌───────────────────┐  │            │
│   │  │  Hono SSE Streaming Adapter   │──►│ Ollama API Stream │  │            │
│   │  └───────────────────────────────┘   └───────────────────┘  │            │
│   └────────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Traceability & Observability

*   **Header Propagation**: The `x-correlation-id` must be sent as a header in the initial SSE request and mapped to the stream context.
*   **Structured Logging**: Log stream lifecycles. Example:
    *   `"Stream connection initiated: correlationId=abc-123"`
    *   `"Stream chunk dispatched: index=42, type=token"`
    *   `"Stream connection closed cleanly: duration=452ms"`
*   **Metrics**:
    *   `reasoning_active_streams`: Gauge tracking current open stream connections.
    *   `reasoning_stream_duration_seconds`: Histogram of streaming connection lifespans.
    *   `reasoning_stream_failures_total`: Counter tracking aborted or errored streams by error type.

---

## 5. Acceptance Criteria

### Happy Path
1. User requests: *"suggest layout for App B"*.
2. The UI renders the Chat block instantly. Text tokens begin printing to screen in under $200\text{ms}$.
3. Status messages (e.g., *"[1/2] Fetching vector store similarities..."*) appear as distinct log steps.
4. The final `<PaywallExperimentCard />` renders once the layout schema variables (`price`, `theme`, `ctaCopy`) are fully streamed.

### Negative Scenarios
*   **Ollama Down**: If the Ollama runtime is offline, the stream should emit a single error chunk `type: 'error'` with a helpful fallback explanation, close cleanly, and avoid crashing the bridge.
*   **Client Interruption**: If the user closes the chat or sends a new prompt mid-stream, the AbortSignal must propagate to `mastra-ai`, immediately aborting the downstream Ollama HTTP request and freeing the CPU threads.
*   **Network Timeouts**: If no data chunks are received for $5000\text{ms}$ during stream execution, the bridge closes the connection and returns a default layout mutation proposal.

---

## 6. Task List

*   `TASK: mastra-ai/src/application/ports.ts | Define streaming LLM reasoning interfaces | Abstract the streaming query contract supporting AbortSignals.`
*   `TASK: mastra-ai/src/infrastructure/adapters/ollama-streaming.ts | Implement Ollama token streaming | Connect to Ollama endpoint with stream=true option and parse SSE stream chunks.`
*   `TASK: mastra-ai/src/infrastructure/server.ts | Expose streaming endpoint | Setup POST /api/reasoning/mutate/stream using Hono's streamSSE helper.`
*   `TASK: copilot-bridge/src/application/ports.ts | Define streaming client ports | Declare StreamingReasoningClient interface.`
*   `TASK: copilot-bridge/src/infrastructure/adapters/http-reasoning.ts | Implement streaming SSE consumer | Build HTTP client parsing 'text/event-stream' lines into structured typed tokens.`
*   `TASK: copilot-bridge/src/infrastructure/server.ts | Hook streaming to CopilotKit Runtime | Update Copilot actions to use CopilotKit's streaming response buffers.`
*   `TASK: copilot-bridge/tests/streaming.test.ts | Create unit tests for stream abort and parsing | Verify connection tear-down and chunk accumulation on mock SSE responses.`
