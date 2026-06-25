# Product Requirements Document (PRD) — Copilot Bridge (`copilot-bridge`)

## 1. Overview & Success Metrics

The **Copilot Bridge** (`copilot-bridge`) is a stateless reasoning gateway designed to coordinate interactive AI optimization loops between the React Frontend Panel, the Mastra AI reasoning engine, and the Telemetry & Analytics Engine.

It provides the backend runtime endpoint for the CopilotKit protocol, allowing the user to initiate optimization audits, view AI-generated UI remediation proposals, and deploy controlled A/B split tests directly from the interactive chat sidebar.

### Success Metrics
*   **Business KPIs**:
    *   100% of user-initiated A/B tests from the Copilot sidebar are successfully split and routed within the telemetry engine.
    *   Zero user sessions get stuck in a hanging state due to upstream AI reasoning timeouts.
*   **Technical KPIs**:
    *   Mocked reasoning response latency: $\le 50\text{ms}$ at 95th percentile.
    *   Downstream HTTP call timeout: Capped at $15\text{s}$ for LLM queries, failing back to a clean user-facing error message.
    *   100% correlation ID propagation: Every request passing through the bridge maintains traceability.

---

## 2. User Stories

*   **Audit Request**: As a growth manager, I want to ask Gemma to audit an application's performance (e.g. "audit App B") so that I can see a side-by-side comparison of the AI-proposed paywall changes.
*   **Controlled Deploy**: As a growth manager, I want to select a target sample size using an interactive slider and click "Deploy Controlled A/B Test" so that the live traffic splits immediately.
*   **Local Developer Mode**: As a developer, I want the Copilot Bridge to operate in a mocked reasoning mode when Mastra AI/Ollama is not running, so that I can develop and verify the frontend independently.

---

## 3. Technical Constraints & Domain Modeling

### Microservices & Interactions
*   **API Gateway Port**: Exposes external port `4005` (REST over HTTP).
*   **Downstream Dependencies**:
    *   `telemetry-analytics` (`http://apo-telemetry-analytics:4003`): Sync REST API.
    *   `mastra-ai` (`http://apo-mastra-ai:4004`): Sync REST API.
*   **State Management**: The service must remain entirely stateless. No database connections are permitted.

### Core Domain Layer (`src/domain`)
Standard TypeScript structures decoupled from databases and frameworks:
*   **Entities**:
    *   `AuditSession`: Tracks the current context of the chat session, including target `appId` and active `experimentId`.
*   **Value Objects**:
    *   `PaywallMutation`: Encapsulates paywall design parameters (e.g., price point, localized currency, visual theme, CTA copywriting).
    *   `SplitConfig`: Captures the configuration for the A/B test (e.g., `appId`, `sampleSizePercent` where $0 \le sampleSizePercent \le 100$, and the target mutation details).
*   **Domain Events**:
    *   None.

### Application Layer (`src/application`)
Coordinates the orchestration of use cases:
*   **Use Cases**:
    *   `RemediateBreach`: Handles optimization audit requests. Looks up current app metrics via telemetry, requests a paywall layout proposal from Mastra AI (or mock generator), and formats the response for CopilotKit's generative UI.
    *   `DeployExperiment`: Validates the experiment configuration and calls the telemetry service to start the A/B split.
*   **Ports (Interfaces)**:
    *   `TelemetryClient`: Port for checking metrics and starting A/B tests.
    *   `ReasoningClient`: Port for requesting paywall mutations from Mastra AI.

### Infrastructure Layer (`src/infrastructure`)
Implements adapters and server configurations:
*   **`HonoHttpServer`**: Runs the Hono app mapping HTTP request parameters to the use cases.
*   **`HttpTelemetryAdapter`**: Implements `TelemetryClient` by making fetch calls to `telemetry-analytics`.
*   **`HttpReasoningAdapter`**: Implements `ReasoningClient` by calling `mastra-ai`.
*   **`MockReasoningAdapter`**: Generates high-quality mock paywall mutations locally when `MOCK_REASONING=true`.

### Hexagonal Architecture Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             INFRASTRUCTURE LAYER                            │
│                                                                             │
│   ┌───────────────┐              ┌─────────────────────────────┐            │
│   │  Hono Server  │              │    HttpTelemetryAdapter     │───REST───► │
│   └───────┬───────┘              └──────────────▲──────────────┘            │
│           │                                     │                           │
│           ▼                                     │                           │
│   ┌────────────────────────────────────────────────────────────┐            │
│   │                     APPLICATION LAYER                      │            │
│   │                                                            │            │
│   │  ┌────────────────────┐            ┌────────────────────┐  │            │
│   │  │  RemediateBreach   │            │  DeployExperiment  │  │            │
│   │  └─────────┬──────────┘            └─────────┬──────────┘  │            │
│   │            │                                 │             │            │
│   │            ▼                                 ▼             │            │
│   │   [ReasoningClient Port]           [TelemetryClient Port]  │            │
│   │                                                            │            │
│   │  ┌──────────────────────────────────────────────────────┐  │            │
│   │  │                     DOMAIN LAYER                     │  │            │
│   │  │                                                      │  │            │
│   │  │   Entities: AuditSession                             │  │            │
│   │  │   Value Objects: PaywallMutation, SplitConfig        │  │            │
│   │  └──────────────────────────────────────────────────────┘  │            │
│   └────────────────────────────────────────────────────────────┘            │
│           ▲                                     │                           │
│           │                                     ▼                           │
│   ┌───────┴───────────────┐              ┌─────────────────────────────┐            │
│   │ HttpReasoningAdapter  │◄────REST─────│    MockReasoningAdapter     │            │
│   └───────────────────────┘              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Traceability & Observability

*   **Correlation ID**: Extract `x-correlation-id` from incoming request headers. Maintain this value in an `AsyncLocalStorage` context and propagate it in all outgoing HTTP request headers to downstream services.
*   **Structured Logging**: Use `pino` to log JSON-formatted lines containing `level`, `time`, `msg`, and `correlationId`.
*   **Prometheus Metrics**: Expose a `/metrics` endpoint collecting:
    *   `http_requests_total`: Counter by path and status code.
    *   `http_request_duration_seconds`: Histogram of request processing times.
    *   `downstream_failures_total`: Counter of failed downstream HTTP requests.

---

## 5. Acceptance Criteria

*   **Happy Path**:
    *   Sending a chatbot message requesting audit triggers a successful downstream call and returns a valid CopilotKit response containing the generative UI payload `<PaywallExperimentCard />`.
    *   Invoking `initiateAbExperiment` action calls the telemetry engine and returns `200 OK` showing the test status.
*   **Negative Scenarios**:
    *   If `sampleSizePercent` is not in range $[0, 100]$, return `400 Bad Request` with type `ValidationError`.
    *   If downstream services fail or timeout, return `503 Service Unavailable` with a structured `DomainError` payload.
*   **Performance SLA**:
    *   Mock responses must resolve in under $50\text{ms}$.
    *   API routes must stream context where possible to avoid blocked Node.js event loops.

---

## 6. Task List

*   `TASK: copilot-bridge/package.json | Set up service dependencies | Verify package.json contains hono, pino, @copilotkit/backend, prom-client, and typescript.`
*   `TASK: copilot-bridge/src/domain/types.ts | Define core domain structures | Compile types without syntax errors. Ensure strictly typed entities (no any).`
*   `TASK: copilot-bridge/src/application/ports.ts | Define ports for telemetry and reasoning | Verify abstract interfaces match the application use cases.`
*   `TASK: copilot-bridge/src/infrastructure/adapters/mock-reasoning.ts | Implement local Mock Reasoning adapter | Verify return data is structured correctly to render PaywallExperimentCard with price/theme variations.`
*   `TASK: copilot-bridge/src/infrastructure/adapters/telemetry.ts | Implement HTTP Telemetry client adapter | Ensure request timeout is configured and x-correlation-id is propagated.`
*   `TASK: copilot-bridge/src/infrastructure/server.ts | Set up Hono router & CopilotKit endpoints | Verify endpoints /copilot/chat and /metrics resolve successfully.`
*   `TASK: backend/infrastructure/docker-compose.yml | Configure service container | Spin up service via docker compose. Validate internal container networks resolve.`
*   `TASK: copilot-bridge/tests/integration.test.ts | Create integration tests for bridge routes | Run tests verifying mock response path and telemetry split action dispatch.`
