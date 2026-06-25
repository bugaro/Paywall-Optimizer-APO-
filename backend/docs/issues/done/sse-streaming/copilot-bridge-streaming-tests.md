---
depends_on: [copilot-bridge-server-stream-hook]
---

# Issue: Integration Testing for SSE Stream Abort and Parsing

## Context
A robust test suite is required to verify stream processing, timeout failbacks, correlation ID propagation, and correct cancellation behavior under various connection conditions.

## Technical Requirements
*   Create [streaming.test.ts](file:///Users/bugaro/projects/apo/backend/services/copilot-bridge/tests/streaming.test.ts).
*   Add integration tests using Hono's test client or Vitest to mock downstream Mastra stream responses.
*   Verify the following scenarios:
    1.  **Happy Path**: A valid SSE stream returns sequential tokens and completes with a valid structured proposal.
    2.  **Downstream Failure**: Mastra service goes down or returns a 500 error mid-stream. Verify the bridge recovers cleanly and serves a default paywall fallback proposal.
    3.  **Abort/Cancel**: Triggering the client abort mid-stream correctly invokes downstream cancel propagation.
    4.  **Timeout**: Mock a hanging stream with no chunks emitted for 5000ms. Verify it cancels and returns fallback state.

## QA & Validation
*   **Unit/Integration**:
    *   Execute the test suite using `npm run test` or `npx vitest run tests/streaming.test.ts`.
    *   Confirm all test cases pass without hanging.
*   **Manual/Automated Step**:
    *   Ensure no test execution threads are left dangling after the suite runs.
*   **Negative Test**:
    *   Verify test assertions explicitly cover simulated stream network dropouts.
*   **Boundary Check**:
    *   Test extreme delays (e.g. 4.9 seconds, just below the timeout threshold) to verify boundary compliance.

## Observability Check
*   None.
