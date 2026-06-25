---
depends_on: [http-server, db-seed]
---

# Issue: End-to-End Integration Tests

## Context
To guarantee system stability, verify technical KPIs, and prevent regression, we must implement an End-to-End (E2E) integration test suite. This suite will programmatically spin up the database, run migrations, boot the Hono HTTP server, initiate the seeding process, start the RxJS simulator, and assert correctness across ingestion, tumbling window aggregation, deterministic variant assignment, and overlap behaviors.

## Technical Requirements
- Create the E2E test file at [e2e.test.ts](file:///Users/bugaro/projects/apo/backend/services/telemetry-analytics/tests/e2e.test.ts).
- Use **Vitest** as the test framework and execution runner.
- **Test Setup Hooks (`beforeAll` / `beforeEach`)**:
  - Establish connection to a clean test PostgreSQL database.
  - Apply migrations to ensure the schema is up to date.
  - Run the `seedDatabaseIfEmpty()` function to verify correct transactional populating.
  - Start the Hono HTTP server instance.
- **E2E Test Scenarios**:
  1. **Seeding Validation**:
     - Query the test database directly.
     - Assert `applications` count is exactly `2`.
     - Assert `users` count is exactly `2000`.
     - Assert `users_to_apps` count is exactly `2200` (verifying the `200` overlap users are associated with both applications).
  2. **Variant Allocation Accuracy**:
     - Call the Hono route `POST /api/events` multiple times using a specific user ID and active A/B test.
     - Assert that the response variant (`'A'` or `'B'`) is deterministic and matches the FNV-1a hash calculation: `fnv1a(userId + testId) % 100 < sampleSizePercent`.
  3. **Buffered Tumbling Window Verification**:
     - Send 50 telemetry events to `POST /api/events` within a 1-second period.
     - Immediately query the database for these events. Verify that they are **not** present yet (verifying the 5-second tumbling window buffer).
     - Wait for 6 seconds.
     - Query the database again. Verify that all 50 events are now written to the `telemetry_events` table.
     - Call `GET /api/metrics?appId={appBId}`. Verify the response contains the aggregated metrics (impressions, clicks, purchases, and conversion rate) split by variant.
  4. **Dynamic Cohort Overlap Verification**:
     - Emulate a purchase event for an overlap user on App A.
     - Verify that the database updates their subscription status: `app_a_subscribed` becomes `true`.
     - Simulate subsequent App B telemetry clicks/purchases for this user. Assert that the simulator calculation yields a conversion probability boost of $+25\%$.
- **Test Teardown Hooks (`afterAll`)**:
  - Close HTTP server connections.
  - Close database connection pool.

## QA & Validation
- **Unit/Integration**:
  - Ensure all assertions use strict equality checks.
  - Verify tests run cleanly on local environments using `npm run test:e2e` or similar command.
- **Manual/Automated Step**:
  - Run the test suite under a Vitest watcher. Assert that test compilation, execution, and teardown take $\le 10$ seconds on average.
- **Negative Test**:
  - Inject an invalid UUID into the ingestion route tests. Assert that the API responds with `400 Bad Request` and that no telemetry events are pushed to the aggregator.
- **Boundary Check**:
  - Verify window boundaries: Send events at $t = 4.9\text{s}$ and $t = 5.1\text{s}$. Assert they land in separate, non-overlapping aggregation windows.

## Observability Check
- **Logging**:
  - Verify that during E2E execution, the Hono server writes structured JSON logs to stdout with correlation IDs.
- **Metrics**:
  - None required for the test execution file itself, but verify that the `/metrics` endpoint is reachable and reports correct counts.
