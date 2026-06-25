---
depends_on: ["FE-04", "FE-05"]
---

# Issue: FE-06: Telemetry Metrics Store with Polling Logic

## Context
The UI relies on real-time aggregated telemetry windows. We need a state manager that polls the metrics endpoint periodically.

## Technical Requirements
* Create `frontend/src/entities/metrics/model/store.ts` using Zustand.
* Implement a polling mechanism (e.g., using setInterval or timeouts) to fetch `GET /api/metrics?appId={id}` every 5 seconds.
* Track fetching, success, and error states. Handle polling start/stop events when tab visibility changes or active application changes.

## QA & Validation
* **Unit/Integration**: Verify polling starts instantly upon component mount and stops when component unmounts.
* **Negative Test**: Mock server 500 crashes and verify the store transitions to an error state, retaining the last cached telemetry safely.

## Observability Check
* Log entry: `[Metrics Poll] Ingested 5s tumbling window | App: <id> | Records: <count>`.
