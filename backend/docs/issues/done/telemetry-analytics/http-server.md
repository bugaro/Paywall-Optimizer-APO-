---
depends_on: [db-schema, deterministic-segmentation, metrics-aggregator, traffic-simulator]
---

# Issue: Hono HTTP API Server

## Context
The HTTP server acts as the primary gateway for telemetry ingestion and metric querying. It handles client/simulator connections, manages correlation contexts for request tracing, evaluates A/B test variants dynamically for incoming events, and queries aggregated metrics. The server must be implemented using Hono and satisfy strict SLA latencies.

## Technical Requirements
- Create the Hono server implementation at [server.ts](file:///Users/bugaro/projects/apo/backend/services/telemetry-analytics/src/infrastructure/http/server.ts).
- **Server Port**: Listen on port `4003`.
- **Global Middlewares**:
  - **Correlation ID**: Intercept incoming `X-Correlation-ID` header or generate a new UUID. Store it using Node's `AsyncLocalStorage` so all subsequent logging statements in that thread context contain the `correlationId`.
  - **Structured Logging**: Write all log messages to `stdout` as JSON containing fields: `level`, `timestamp`, `message`, `correlationId`, and `serviceContext` (`"telemetry-analytics"`).
  - **CORS**: Allow requests from all origins or explicitly the React frontend URL.
- **REST Endpoints**:
  1. **`POST /api/events` (Telemetry Ingestion)**:
     - Request body validation: Validate that `userId` and `appId` are valid UUIDs, and `eventType` is one of `'impression'`, `'click'`, or `'purchase'`. If invalid, return `400 Bad Request`.
     - Target SLA: Response latency $\le 20\text{ms}$ at $\text{P95}$.
     - Business logic:
       - Query active A/B test for the given `appId` (cache this or query efficiently).
       - If no active test is found, assign variant `'A'` directly.
       - If an active test is found, execute the deterministic segmentation helper: `evaluateSegment(userId, test.id, test.sampleSizePercent)`.
       - Form a `TelemetryEvent` containing `userId`, `appId`, `eventType`, the resolved `variant` (`'A'` or `'B'`), and the current `timestamp`.
       - Push the event to the `metrics-aggregator` via `pushEvent()`.
       - Return `202 Accepted` (or `200 OK`) with `{ success: true, variant: 'A' | 'B' }`.
  2. **`GET /api/metrics` (Performance Reporting)**:
     - Request query validation: `appId` must be a valid UUID. Optional `since` date parameter (defaults to last 1 hour).
     - Target SLA: Response latency $\le 100\text{ms}$ at $\text{P95}$.
     - Business logic:
       - Query DB via repository to aggregate count of impressions, clicks, and purchases in tumbling windows (grouped by 5-second intervals or similar time ranges) split by variant `'A'` and `'B'`.
       - Return JSON array format:
         ```typescript
         Array<{
           timestamp: string; // ISO string of window start
           variant: 'A' | 'B';
           impressions: number;
           clicks: number;
           purchases: number;
           conversionRate: number; // purchases / impressions (safe division)
         }>
         ```
  3. **`GET /metrics` (Prometheus Metrics)**:
     - Expose memory usage, event processing counts, active db connections, and HTTP request statistics.

## QA & Validation
- **Unit/Integration**:
  - Test validation middleware: Send payload with missing `userId` or invalid UUID format. Assert `400 Bad Request` is returned.
  - Test telemetry route: Mock `metrics-aggregator` and active A/B test. Assert variant is assigned correctly and response time is minimal.
- **Manual/Automated Step**:
  - Run the Hono server. Perform curl requests to `POST /api/events` and verify JSON log output containing the correlation ID.
- **Negative Test**:
  - Query `GET /api/metrics` without `appId`. Verify it returns `400 Bad Request`.
- **Boundary Check**:
  - Send timestamp queries with format discrepancies (e.g. malformed date strings). Ensure server returns structured error rather than unhandled exception.

## Observability Check
- **Logging**:
  - Log server bootstrap: `"Hono HTTP server listening on port 4003"`.
  - Log request processing: `"Request received: {method} {path}"`.
  - Log execution errors: `"Unhandled exception caught in HTTP controller: {error}"`.
- **Metrics**:
  - Expose default Prometheus request rate and latency metrics: `http_requests_total{method, path, status}`, `http_request_duration_seconds`.
