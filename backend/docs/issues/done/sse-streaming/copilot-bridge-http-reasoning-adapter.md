---
depends_on: [copilot-bridge-application-ports]
---

# Issue: Implement HTTP SSE Stream Consumer in Copilot Bridge

## Context
This task updates the HTTP reasoning adapter in the Copilot Bridge. Instead of performing a blocking POST request, the adapter will process the stream from the Mastra AI service chunk-by-chunk and propagate correlation headers.

## Technical Requirements
*   Modify or extend [http-reasoning.ts](file:///Users/bugaro/projects/apo/backend/services/copilot-bridge/src/infrastructure/adapters/http-reasoning.ts).
*   Create a client adapter implementing `StreamingReasoningClient`.
*   Send a POST request to `${MASTRA_AI_URL}/api/reasoning/mutate/stream` with the JSON payload and proper headers (including `x-correlation-id`).
*   Verify the response headers confirm a stream is returned (`Content-Type: text/event-stream`).
*   Consume the stream body using a standard readable stream reader (`ReadableStreamDefaultReader` or through event-stream parsers).
*   Correctly parse incoming lines prefix-matched with `data: ` as JSON objects mapping to `ReasoningChunk`.
*   Propagate the client abort signal downstream.

## QA & Validation
*   **Unit/Integration**:
    *   Verify the stream reader handles incomplete chunks or split TCP packet windows gracefully.
*   **Manual/Automated Step**:
    *   Write a mock stream emitter that pushes test tokens, and assert the adapter correctly outputs them as `ReasoningChunk` objects.
*   **Negative Test**:
    *   Simulate Mastra returning a `503 Service Unavailable` or a broken non-SSE output. Ensure the adapter fails back cleanly without throwing unhandled exceptions.
*   **Boundary Check**:
    *   Ensure that when the stream completes or errors out, the reader and controller are closed/released cleanly.

## Observability Check
*   **Logging**:
    *   Log `"Downstream stream connected: correlationId=..."` and `"Downstream stream chunk processed: size=..."`.
*   **Metrics**:
    *   Increment `downstream_stream_failures_total` on connection errors or parse exceptions.
