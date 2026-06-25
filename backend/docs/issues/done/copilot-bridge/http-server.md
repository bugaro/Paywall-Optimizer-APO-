---
depends_on: [adapter-mock-reasoning, adapter-telemetry]
---

# Issue: Set Up Hono Server, Middleware, and CopilotKit Endpoints

## Context
This task configures the HTTP server runtime using Hono, registers the CopilotKit chat endpoint, hooks up the telemetry actions, and exposes performance metrics.

## Technical Requirements
*   Create [server.ts](file:///Users/bugaro/projects/apo/backend/services/copilot-bridge/src/infrastructure/server.ts).
*   Initialize Hono server.
*   Implement correlation ID middleware: extract `x-correlation-id` from request headers, initialize `AsyncLocalStorage` store, and set a new correlation ID if missing.
*   Expose `/copilot/chat` endpoint wrapping the `@copilotkit/runtime` (or equivalent SDK backend).
*   Register action `initiateAbExperiment` that parses `appId`, `sampleSizePercent`, and `mutation` properties.
*   Validate inputs: throw `ValidationError` (400) if `sampleSizePercent` is outside $[0, 100]$.
*   Expose `/metrics` endpoint using `prom-client` to report request counts and durations.

## QA & Validation
*   **Unit/Integration**:
    *   Test validation schema for `initiateAbExperiment`.
*   **Manual/Automated Step**:
    *   Start Hono server locally and run `curl http://localhost:4005/metrics` to verify metrics payload format.
*   **Negative Test**:
    *   Post to action handler with `sampleSizePercent: 120`. Verify server responds with `400 Bad Request`.
*   **Boundary Check**:
    *   Test edge cases for sample size: exactly `0` and exactly `100` should be accepted.

## Observability Check
*   **Logging**:
    *   Log requests using Pino including method, URL, status code, and `correlationId`.
*   **Metrics**:
    *   Expose `http_requests_total` counter and `http_request_duration_seconds` histogram.
