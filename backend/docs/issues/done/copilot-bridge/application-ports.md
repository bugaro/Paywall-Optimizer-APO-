---
depends_on: [domain-types]
---

# Issue: Define Application Ports (Client Interfaces)

## Context
This task defines the interface boundaries (ports) for downstream services. By decoupling use cases from the actual HTTP client implementations, the system remains clean and testable.

## Technical Requirements
*   Create [ports.ts](file:///Users/bugaro/projects/apo/backend/services/copilot-bridge/src/application/ports.ts).
*   Define the following port interfaces:
    *   `TelemetryClient`:
        *   `fetchMetrics(appId: string): Promise<TelemetryMetrics>`
        *   `initiateExperiment(config: SplitConfig): Promise<boolean>`
    *   `ReasoningClient`:
        *   `generateMutation(appId: string, currentMetrics: TelemetryMetrics): Promise<PaywallMutation>`

## QA & Validation
*   **Unit/Integration**:
    *   Verify code compiles with `npx tsc --noEmit` and has no type errors.
*   **Manual/Automated Step**:
    *   None.
*   **Negative Test**:
    *   None.
*   **Boundary Check**:
    *   None.

## Observability Check
*   None.
