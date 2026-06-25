---
depends_on: [application-ports]
---

# Issue: Implement HTTP Telemetry Service Adapter

## Context
This task implements the client adapter calling the downstream `telemetry-analytics` microservice. It must manage HTTP payloads, handle request timeouts, and propagate correlation headers.

## Technical Requirements
*   Create [telemetry.ts](file:///Users/bugaro/projects/apo/backend/services/copilot-bridge/src/infrastructure/adapters/telemetry.ts).
*   Implement `TelemetryClient`.
*   Connect to URL resolved from `TELEMETRY_ANALYTICS_URL`.
*   Propagate incoming `x-correlation-id` header in all outgoing requests.
*   Enforce a timeout limit of $5\text{ seconds}$ on all outgoing fetch calls.

## QA & Validation
*   **Unit/Integration**:
    *   Test that the HTTP adapter correctly appends `x-correlation-id` to outgoing headers.
    *   Simulate a hanging telemetry server and verify that the adapter aborts the request and throws a `DomainError` after 5 seconds.
*   **Manual/Automated Step**:
    *   None.
*   **Negative Test**:
    *   If the telemetry engine returns a 500 error, verify the adapter maps it to a `DomainError` containing the status code.
*   **Boundary Check**:
    *   None.

## Observability Check
*   **Logging**:
    *   Log warning on downstream HTTP timeout: `"Downstream call to telemetry-analytics timed out."`.
*   **Metrics**:
    *   Increment `downstream_failures_total` counter if HTTP request fails or times out.
