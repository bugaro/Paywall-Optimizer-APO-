---
depends_on: ["FE-01"]
---

# Issue: FE-04: Implement Typed Fetch Client with Correlation ID

## Context
A standardized, trace-aware API client is necessary to call analytics endpoints and keep track of logs through the distributed system.

## Technical Requirements
* Create `frontend/src/shared/api/client.ts`.
* Build a typed wrapper around the native `fetch` API:
  * Automatically inject an `X-Correlation-ID` UUID header into every outgoing HTTP request.
  * Inject standard content-type headers.
  * Implement an execution timeout threshold of $5000ms$.
  * Handle HTTP errors by mapping them to explicit custom classes (e.g. `ApiError`, `ValidationError`).

## QA & Validation
* **Unit/Integration**: Mock network requests and verify the `X-Correlation-ID` header contains a valid generated UUID.
* **Negative Test**: Force a endpoint to hang and assert that the client aborts the request at $5000ms$, throwing a Timeout error.

## Observability Check
* Logger prints request trace log: `[API Request] GET /api/metrics | correlationId: <uuid> | duration: <ms>`.
