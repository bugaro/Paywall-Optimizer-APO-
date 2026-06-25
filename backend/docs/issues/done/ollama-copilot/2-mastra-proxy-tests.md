---
depends_on: [1-mastra-proxy-route]
---

# Issue: Create unit tests for mastra-ai proxy route

## Context
We need to ensure the proxy endpoint correctly forwards requests, rewrites URLs/headers, handles HTTP status code responses, and supports chunk-by-chunk SSE streaming without buffering.

## Technical Requirements
Create `backend/services/mastra-ai/tests/proxy.test.ts`:
*   Establish mock handlers for the Ollama backend.
*   Validate that:
    1.  Request methods, query params, and body are preserved and mapped to the target Ollama route.
    2.  `host` header is stripped and overwritten.
    3.  `x-correlation-id` and W3C tracing context headers are propagated.
    4.  SSE stream headers (`text/event-stream`) and partial chunks are streamed successfully.

## QA & Validation
*   **Unit/Integration:** Run `npm run test` or `vitest run tests/proxy.test.ts` in `mastra-ai` service folder and verify all test cases pass.
*   **Manual Step:** Verify that when streaming response from the proxy, chunk boundaries match the backend Ollama chunks exactly.

## Observability Check
*   No additional logs or metrics are required for tests.
