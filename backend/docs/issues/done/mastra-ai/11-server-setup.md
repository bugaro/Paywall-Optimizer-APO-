---
depends_on: ["10-generate-proposal-use-case"]
---

# Issue: Setup Hono HTTP Server and Routes

## Context
We need to expose the Mastra reasoning use-cases via a REST HTTP API server so that downstream gateways (such as `copilot-bridge`) can synchronously request paywall mutations.

## Technical Requirements
- Create `services/mastra-ai/src/infrastructure/server.ts`:
  - Initialize Hono API server listening on environment variable `PORT` (default `4006`).
  - Add middleware to parse correlation ID headers (`X-Correlation-ID`) and inject them into request logs.
  - Implement endpoint `POST /api/reasoning/mutate`:
    - Body params: `appId: string`, `metrics: TelemetryMetrics`.
    - Invoke the `GenerateRemediationProposal` use-case.
    - Return `200 OK` with the proposal.
  - Implement `/metrics` endpoint to expose Prometheus metrics.
  - Implement `/health` endpoint for Docker container checks.

## QA & Validation
- **Unit/Integration**: Write integration test `tests/infrastructure/server.test.ts` using Hono's `app.request()` to trigger mock API requests.
- **Manual/Automated Step**: Start the server locally and curl the health and metrics endpoints.
- **Negative Test**: Send a request with a missing body parameter or invalid metrics payload to verify a `400 Bad Request` or validation error is returned.
- **Boundary Check**: Verify that `X-Correlation-ID` headers are propagated correctly in the HTTP response headers.

## Observability Check
- **Logging**: Log request ingress/egress:
  - `"Incoming request: POST /api/reasoning/mutate with correlation ID <id>"`
  - `"Returning mutation proposal for app <appId> in <time_ms>"`
- **Metrics**: Expose standard request count metrics.
