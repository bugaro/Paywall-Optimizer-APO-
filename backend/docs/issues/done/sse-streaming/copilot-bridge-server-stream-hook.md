---
depends_on: [copilot-bridge-http-reasoning-adapter]
---

# Issue: Hook Streaming to CopilotKit Runtime Endpoint

## Context
To stream tokens back to the user's React sidebar, the Copilot Bridge server needs to leverage CopilotKit Runtime's streaming execution protocols in its route handlers and actions.

## Technical Requirements
*   Modify [server.ts](file:///Users/bugaro/projects/apo/backend/services/copilot-bridge/src/infrastructure/server.ts).
*   Refactor the `remediateBreach` tool action to support streaming output if supported by `@copilotkit/runtime` (e.g. returning stream buffers or text writer streams).
*   Integrate the `StreamingReasoningClient` adapter instance into the route execution context.
*   Pipe incoming `ReasoningChunk` tokens directly into Copilot's response stream container.
*   Configure stream abort listeners: if the Copilot connection is closed by the frontend client, trigger the `AbortController` linked to the downstream Mastra fetch stream.

## QA & Validation
*   **Unit/Integration**:
    *   Verify the endpoint `/copilot/chat` responds to query streams correctly.
*   **Manual/Automated Step**:
    *   Deploy the service and trigger the chat Sidebar from the React frontend, verifying tokens appear step-by-step rather than in a single block.
*   **Negative Test**:
    *   Disconnect the network cable or close the browser tab during LLM generation. Confirm the backend console logs connection termination and stops processing immediately.
*   **Boundary Check**:
    *   Verify correct output mapping for very short or long agent responses.

## Observability Check
*   **Logging**:
    *   Log `"Copilot stream connected: correlationId=..."` and `"Copilot stream disconnected: status=..."`.
*   **Metrics**:
    *   Expose `copilot_active_streams` gauge.
