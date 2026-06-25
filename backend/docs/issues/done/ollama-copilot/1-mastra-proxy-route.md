---
depends_on: []
---

# Issue: Expose OpenAI-compatible proxy route in mastra-ai

## Context
To prevent `copilot-bridge` from directly accessing the `ollama` container, `mastra-ai` must act as a gateway/proxy. We need to implement an OpenAI-compatible wildcard proxy endpoint in `mastra-ai` that forwards incoming OpenAI/Vercel AI SDK requests directly to Ollama's `/v1/*` endpoint.

## Technical Requirements
Modify `backend/services/mastra-ai/src/infrastructure/server.ts`:
*   Add a catch-all route under `/api/reasoning/openai/*` (e.g. `app.all('/api/reasoning/openai/*', ...)`).
*   In the handler:
    1.  Extract the subpath (e.g. `/api/reasoning/openai/chat/completions` becomes `/v1/chat/completions`).
    2.  Read the target Ollama base URL from `process.env.OLLAMA_URL` (default `http://localhost:11434`).
    3.  Construct the target URL (e.g. `http://ollama:11434/v1/chat/completions`).
    4.  Forward the HTTP request methods (POST, GET, etc.), headers (with `host` header stripped/rewritten), and payload body.
    5.  Return the response body directly (supporting standard SSE streaming).

## QA & Validation
*   **Unit/Integration:** Validate that a POST request to `/api/reasoning/openai/chat/completions` returns the expected Ollama JSON response.
*   **Manual Step:** Verify the file compiles cleanly using TypeScript compiler (`tsc`).
*   **Negative Test:** If Ollama is down, verify the proxy returns a clean `503 Service Unavailable` with JSON error payload.
*   **Boundary Check:** N/A.

## Observability Check
*   **Logging:** Log proxy routing actions with trace context:
    `logger.info("Proxying OpenAI request from subpath ${subpath} to Ollama");`
