---
depends_on: [http-server]
---

# Issue: Create Copilot Bridge Integration Test Suite

## Context
This task writes a comprehensive suite of integration tests to verify endpoint routing, input validation boundaries, mock responses, and downstream error mapping.

## Technical Requirements
*   Create [integration.test.ts](file:///Users/bugaro/projects/apo/backend/services/copilot-bridge/tests/integration.test.ts).
*   Test suites:
    *   `GET /metrics`: Should return 200 and standard Prometheus text payload containing `http_requests_total`.
    *   `/copilot/chat` with mock audit request: Verify response contains the generated UI payload with App B optimization variables.
    *   `initiateAbExperiment` action dispatcher:
        *   Accept split config payload and return success response.
        *   Validate boundaries: verify 400 Bad Request is returned for sample size $< 0$ or $> 100$.

## QA & Validation
*   **Unit/Integration**:
    *   Run tests using Vitest or Jest. Verify all assertions pass.
*   **Manual/Automated Step**:
    *   Run `npm run test` inside the service folder.
*   **Negative Test**:
    *   Assert that when telemetry service is unreachable, the API returns a structured HTTP 503 response.
*   **Boundary Check**:
    *   Assert sample size boundary edges: `0` (valid), `100` (valid), `-1` (invalid), `101` (invalid).

## Observability Check
*   None.
