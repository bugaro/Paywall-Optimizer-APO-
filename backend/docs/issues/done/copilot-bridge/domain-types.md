---
depends_on: [setup-package]
---

# Issue: Define Domain Entities and Value Objects

## Context
This task defines the domain layer of the `copilot-bridge` service. These types encapsulate the application metrics, paywall mutations, and split test configurations, ensuring a standard core domain model.

## Technical Requirements
*   Create [types.ts](file:///Users/bugaro/projects/apo/backend/services/copilot-bridge/src/domain/types.ts).
*   Define the following types:
    *   `PaywallMutation`:
        *   `price`: string (e.g., `"$7.99"`).
        *   `theme`: `'light' | 'dark-slate'`.
        *   `ctaCopy`: string.
    *   `TelemetryMetrics`:
        *   `impressions`: number.
        *   `clicks`: number.
        *   `conversions`: number.
        *   `conversionRate`: number.
    *   `SplitConfig`:
        *   `appId`: string.
        *   `sampleSizePercent`: number.
        *   `mutation`: PaywallMutation.
*   Enforce strict typing (strictly no `any`).

## QA & Validation
*   **Unit/Integration**:
    *   Run `npx tsc --noEmit` to verify syntax and type correctness.
*   **Manual/Automated Step**:
    *   None.
*   **Negative Test**:
    *   None.
*   **Boundary Check**:
    *   None.

## Observability Check
*   None.
