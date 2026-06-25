---
depends_on: [mastra-ai-application-ports]
---

# Issue: Implement Ollama Token Streaming Adapter

## Context
This task implements the streaming adapter connecting the Mastra AI service directly to the Ollama runtime. The adapter must invoke the local Gemma LLM model with the stream option enabled and yield parsed token chunks sequentially.

## Technical Requirements
*   Create or modify [ollama-streaming.ts](file:///Users/bugaro/projects/apo/backend/services/mastra-ai/src/infrastructure/adapters/ollama-streaming.ts).
*   Implement the LLM reasoning port interface using the local Ollama API endpoint (`POST /api/generate` or `/api/chat`).
*   Pass the parameter `stream: true` in the HTTP post request body.
*   Process the HTTP response body as a readable stream (`ReadableStream` or Node `Readable`).
*   Listen to the provided `AbortSignal`. If the signal triggers an abort, immediately abort the downstream HTTP fetch request to Ollama to release CPU and inference capacity.

## QA & Validation
*   **Unit/Integration**:
    *   Mock the Ollama HTTP streaming endpoint yielding mock server-sent lines.
    *   Verify that triggering the `AbortSignal` invokes `AbortController.abort()` on the fetch request.
*   **Manual/Automated Step**:
    *   Write a scratch script calling the streaming adapter directly with a live local Ollama runtime, validating that chunks print to console.
*   **Negative Test**:
    *   Simulate a network timeout or connection reset. Ensure the readable stream propagates a clean error state without leaking open sockets.
*   **Boundary Check**:
    *   Ensure the adapter gracefully handles empty token outputs or large buffers.

## Observability Check
*   **Logging**:
    *   Log token stream start, stream abort, and final stream consumption duration.
*   **Metrics**:
    *   Increment `ollama_stream_aborts_total` on canceled streams.
