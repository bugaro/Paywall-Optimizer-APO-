# Product Requirements Document (PRD) — Ollama Integration via Mastra Gateway (`copilot-bridge` & `mastra-ai`)

## 1. Overview & Success Metrics

The goal of this feature is to enable the Copilot Gateway (`copilot-bridge`) to route chat completions to a local **Ollama** instance running the **Gemma** model *through* the **Mastra AI** (`mastra-ai`) service. This removes the hard dependency on an external OpenAI API key and avoids exposing the raw Ollama container directly to the Copilot Gateway, centralizing all AI operations within the `mastra-ai` service boundary.

### Success Metrics
*   **Business & Developer KPIs**:
    *   100% of Copilot conversational chat sessions can execute completely offline without requiring an `OPENAI_API_KEY` when `COPILOT_AGENT_PROVIDER=mastra-ollama` is set.
    *   No direct network routing is required from `copilot-bridge` to the raw `ollama` container port, maintaining a clean microservice separation.
*   **Technical KPIs**:
    *   Time-to-first-token (TTFT) through the Mastra proxy to local Ollama: $\le 180\text{ms}$ at 90th percentile (assuming model is pre-warmed).
    *   Zero server crashes in `copilot-bridge` when the `mastra-ai` proxy or `ollama` is unreachable; the gateway must return a clean, user-facing error.

---

## 2. User Stories

*   **Offline Development**: As a developer, I want to run the APO dashboard and interact with the Copilot sidebar without needing to configure or pay for an external OpenAI API key.
*   **Encapsulated Architecture**: As a system architect, I want `copilot-bridge` to only communicate with `mastra-ai` for any LLM requests, so that my container networking remains decoupled and simple.

---

## 3. Technical Constraints & Domain Modeling

### Microservices & Interactions
*   **Gateway Port**: `copilot-bridge` exposes external port `4005` (REST over HTTP).
*   **Downstream Service**:
    *   `mastra-ai` (`http://apo-mastra-ai:4006`): Exposes a new wildcard proxy endpoint `ALL /api/reasoning/openai/*` that forwards incoming requests directly to the internal `ollama` endpoint (`http://ollama:11434/v1/*`).
*   **Network Isolation**: `copilot-bridge` has **no** direct access to the `ollama` container. It resolves and communicates only with `apo-mastra-ai` (port `4006`).

### Core Domain Layer (`src/domain`)
*   **Value Objects / Types**:
    *   `AgentProvider`: Enforces the selection of either `'openai'` or `'ollama'`.
    *   `AgentModel`: Validates acceptable model identifiers.

### Application Layer
*   **Use Cases**:
    *   `ResolveAgentModel`: Resolves the active model provider and returns a Vercel AI SDK compatible `LanguageModel` instance.

### Infrastructure Layer
*   **Adapters**:
    *   `OpenAIProviderAdapter`: In `copilot-bridge`, leverages `@ai-sdk/openai` to build the client instance, setting its `baseURL` to point to the `mastra-ai` proxy URL (`http://apo-mastra-ai:4006/api/reasoning/openai`).
    *   `OpenAICompatibleProxy`: In `mastra-ai`, a Hono catch-all handler that proxies requests to the local `ollama` container `/v1/*` endpoint.

### Hexagonal Architecture Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             INFRASTRUCTURE LAYER                            │
│                                                                             │
│   ┌───────────────┐              ┌─────────────────────────────┐            │
│   │ copilot-bridge│              │    OpenAIProviderAdapter    │───HTTP───► │
│   │  Hono Server  │              │    (Mastra Proxy URL)       │            │
│   └───────────────┘              └──────────────▲──────────────┘            │
│                                                 │                           │
│                                                 ▼                           │
│   ┌───────────────┐              ┌─────────────────────────────┐            │
│   │   mastra-ai   │◄───HTTP──────│    OpenAICompatibleProxy    │───HTTP───► [ollama]
│   │  Hono Server  │              │      (Ollama Base URL)      │            │
│   └───────────────┘              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Traceability & Observability

*   **Trace Context Propagation**: Outgoing requests from `copilot-bridge` through the `mastra-ai` proxy to Ollama must carry the W3C trace context headers and `x-correlation-id` to ensure complete traceability across both services.
*   **Error Monitoring**: Capture connection timeouts in the proxy and increment `downstream_failures_total` on both services.

---

## 5. Acceptance Criteria

*   **Happy Path**:
    *   With `COPILOT_AGENT_PROVIDER=ollama` and `COPILOT_AGENT_MODEL=gemma4:e4b`, `copilot-bridge` starts successfully. Chat messages successfully stream tokens, passing through the `mastra-ai` proxy to the local Ollama instance.
*   **Negative Scenarios**:
    *   If the `mastra-ai` proxy or the underlying Ollama instance is down, return a structured `503 Service Unavailable` error payload to the frontend.
    *   If an invalid provider is specified (e.g. `COPILOT_AGENT_PROVIDER=invalid`), fall back safely to `openai:gpt-4o-mini` and log a warning.

---

## 6. Task List

### mastra-ai Service Tasks
*   `TASK: mastra-ai/src/infrastructure/server.ts | Expose OpenAI-compatible proxy route | Implement Hono catch-all handler for /api/reasoning/openai/* that rewrites and proxies requests to Ollama.`
*   `TASK: mastra-ai/tests/proxy.test.ts | Create unit tests for proxy route | Verify request header rewriting, status propagation, and streaming compatibility.`

### copilot-bridge Service Tasks
*   `TASK: copilot-bridge/package.json | Add @ai-sdk/openai dependency | Verify package.json contains @ai-sdk/openai entry and lockfile is updated.`
*   `TASK: copilot-bridge/src/domain/constants.ts | Add Mastra Proxy default constants | Define MASTRA_AI_PROXY_URL, default provider, and model configurations.`
*   `TASK: copilot-bridge/src/infrastructure/server.ts | Implement resolveAgentModel resolver | Update server file to dynamically resolve BuiltInAgent model configuration pointing to the Mastra proxy.`
*   `TASK: copilot-bridge/docker-compose.yml | Configure service environment | Add MASTRA_AI_URL and agent provider configs to the docker-compose YAML. Remove direct ollama dependency.`
*   `TASK: copilot-bridge/tests/ollama-proxy.test.ts | Create unit tests for proxy routing | Validate that provider config resolves the correct Vercel AI SDK target client pointing to mastra-ai.`
