---
depends_on: [mastra-ai-ollama-streaming-adapter]
---

# Issue: Expose POST /api/reasoning/mutate/stream Hono Endpoint

## Context
The Mastra AI service needs to expose the streaming endpoint to the network so that the Copilot Bridge can request real-time optimization layout proposals.

## Technical Requirements
*   Modify [server.ts](file:///Users/bugaro/projects/apo/backend/services/mastra-ai/src/infrastructure/server.ts).
*   Define the route `POST /api/reasoning/mutate/stream`.
*   Validate the request payload using Zod (containing `appId` and `metrics`).
*   Utilize Hono's streaming helper `streamSSE` to construct and return a `text/event-stream` response.
*   Forward the Hono request's close signal (or abort context) to the streaming reasoning port so that disconnecting client sockets automatically cancels LLM inference.
*   Set appropriate SSE headers (e.g. `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`).

## QA & Validation
*   **Unit/Integration**:
    *   Verify the endpoint responds with header `Content-Type: text/event-stream`.
*   **Manual/Automated Step**:
    *   Use curl to hit the route: `curl -N -X POST -H "Content-Type: application/json" -d '{"appId":"...", "metrics":{}}' http://localhost:4006/api/reasoning/mutate/stream` and check if SSE chunks print incrementally.
*   **Negative Test**:
    *   Post invalid JSON or empty appId payloads, and verify the server immediately yields `400 Bad Request` before initiating the stream.
*   **Boundary Check**:
    *   Verify request handling under a closed socket client-side during the first 100ms of streaming.

## Observability Check
*   **Logging**:
    *   Log `"SSE stream start: correlationId=..."` and `"SSE stream end: correlationId=..."`.
*   **Metrics**:
    *   Track concurrent stream sessions with a Prometheus gauge `mastra_active_sse_streams`.
