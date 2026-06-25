---
depends_on: [db-schema]
---

# Issue: Tumbling Window Metrics Aggregator

## Context
High-concurrency traffic streams (up to 2,000 active concurrent simulated users) can saturate database connection pools if every telemetry event is saved with an individual write query. To optimize write performance and prevent database read pollution, the Telemetry & Analytics Service will implement an RxJS tumbling window aggregator. The aggregator buffers incoming telemetry events in-memory for 5 seconds and writes them in batches to the database.

## Technical Requirements
- Create the aggregator class/service at [metrics-aggregator.ts](file:///Users/bugaro/projects/apo/backend/services/telemetry-analytics/src/application/use-cases/metrics-aggregator.ts).
- **In-Memory Buffering**:
  - Expose a method `pushEvent(event: TelemetryEvent): void` that pushes events onto a private RxJS `Subject<TelemetryEvent>`.
  - Subscribe to this Subject using the `.pipe(...)` operator.
  - Implement a tumbling window using the `bufferTime(5000)` operator (5-second window).
- **Batch DB Persistence**:
  - When the 5-second window emits the accumulated array of events, check if the array is non-empty.
  - Call `TelemetryRepository.saveBatch(events)` to write all events in the batch via a single bulk insert query.
- **Resiliency & Retry Logic**:
  - In the event of a transient database error during the batch save:
    - Retry the database operation up to **3 times** with exponential backoff (e.g., initial delay of 500ms, doubling each retry).
    - If all retries fail, log a critical error, alert via metrics, and discard the batch or write it to a dead-letter recovery log/file to prevent memory leaks or blocking the main stream.
- **Graceful Shutdown**:
  - Implement a `shutdown()` method to flush any remaining buffered events in the current window before completing the subscription.

## QA & Validation
- **Unit/Integration**:
  - Verify `bufferTime(5000)` behaves correctly: Push 100 events, wait 5 seconds, and verify `TelemetryRepository.saveBatch` is called exactly once with 100 events.
  - Verify that if multiple windows emit, they do not overlap.
- **Manual/Automated Step**:
  - Run a mock load test pushing 5,000 events over 15 seconds. Confirm that the repository records exactly 3 batch insert transactions.
- **Negative Test**:
  - Mock a temporary database connection failure (throw error for the first 2 calls to `saveBatch`, then succeed on the 3rd). Verify the aggregator retries twice and successfully saves the batch on the 3rd attempt without event loss.
  - Mock a permanent database failure (throw error on all attempts). Verify that after 3 retries, the error is caught, logged as critical, and does not crash the Node process.

## Observability Check
- **Logging**:
  - Log batch writes: `"Flushing telemetry batch to database. Size: {batchSize}"`.
  - Log transient DB retries: `"Database insert failed. Retrying batch save (Attempt {attempt} of 3)..."`.
  - Log critical failures: `"CRITICAL: Failed to flush telemetry batch after 3 attempts. Data lost."`.
- **Metrics**:
  - Count of total events aggregated: `telemetry_events_ingested_total{app_id}`.
  - Count of database batches written: `telemetry_db_batches_written_total`.
  - Count of database write failures: `telemetry_db_write_failures_total`.
