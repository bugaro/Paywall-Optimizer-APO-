---
depends_on: [deterministic-segmentation]
---

# Issue: RxJS Traffic Simulator Engine

## Context
To validate our real-time metrics aggregator and A/B isolation tests under load, we need a simulator that generates realistic user traffic. The simulator models the behavioral dynamics of our 2,000 virtual users (including exclusive and overlap users). Overlap users should experience dynamic conversion rate shifts (boosts/decays) in App B depending on their subscription status in App A. The simulator must run concurrently in a non-blocking loop using RxJS.

## Technical Requirements
- Create the simulator file at [traffic-simulator.ts](file:///Users/bugaro/projects/apo/backend/services/telemetry-analytics/src/infrastructure/simulator/traffic-simulator.ts).
- **Virtual User Representation**:
  - Load the user cohort from database on initialization, caching user metadata and active app mappings (exclusive App A, exclusive App B, overlap users).
  - Track in-memory state of subscription status (`app_a_subscribed`, `app_b_subscribed`) for each user.
- **Simulation Loop (RxJS)**:
  - Construct an RxJS streaming pipeline powered by a ticker (e.g. `timer(0, 100)` or `interval(100)`).
  - Periodically select a subset of users to initiate actions (impressions, clicks, purchases).
  - Use RxJS operators like `mergeMap` or `concatMap` with concurrency limits to throttle outgoing event requests, ensuring the event-loop lag remains $\le 10\text{ms}$.
- **Probability Matrix & Cross-App Overlap Behavior**:
  - Define baseline conversion probabilities (e.g., click probability given impression, purchase probability given click).
  - Apply the following multipliers dynamically:
    - **A/B Test Variant**: Query active A/B tests. For users undergoing A/B testing on App B, evaluate their assigned variant (A or B) using `evaluateSegment`. Adjust probability matrices for Variant B users (e.g., test variant has a $+15\%$ relative boost to click/purchase rates).
    - **App A subscription impact on App B**: For overlap users, if `app_a_subscribed` is `true`, apply a $+25\%$ boost (multiplier of `1.25`) to App B conversion rates (click and purchase probabilities).
  - If a simulated user completes a `purchase` event in App A, dynamically update their in-memory `app_a_subscribed` flag to `true` and persist it to the DB via `UserRepository.updateSubscription`.
- **Event Dispatching**:
  - Format telemetry events as: `{ userId: string; appId: string; eventType: 'impression' | 'click' | 'purchase' }`.
  - Dispatch events by issuing an HTTP `POST /api/events` to the local Hono instance.

## QA & Validation
- **Unit/Integration**:
  - Verify that the simulator can run without throwing exceptions.
  - Mock the HTTP server and count emitted events over a 30-second window. Verify event frequencies are within expected boundaries.
  - Verify that when an overlap user transitions to `app_a_subscribed = true`, their subsequent App B events utilize the $+25\%$ conversion boost.
- **Manual/Automated Step**:
  - Implement a unit test measuring event loop lag using `blocked` or manual `hrtime()` delta metrics during high-concurrency simulation checks (2,000 active virtual users). Assert that lag is $\le 10\text{ms}$.
- **Negative Test**:
  - Simulate downstream server outage (HTTP 500 or network failure). Verify the simulator does not crash and continues its loop, utilizing an in-memory queue or dropping failed dispatches gracefully.

## Observability Check
- **Logging**:
  - Log simulator lifecycle events: `"Traffic simulator started with 2000 virtual users"`, `"Batch of telemetry events dispatched to Hono"`.
- **Metrics**:
  - Track generated telemetry events count via Prometheus counter: `simulator_events_generated_total{app_id, event_type}`.
  - Track simulator event-loop lag in milliseconds.
