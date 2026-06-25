---
depends_on: [application-ports]
---

# Issue: Implement Mock Reasoning Infrastructure Adapter

## Context
This task implements a local mock reasoning adapter conforming to `ReasoningClient` port. This allows the bridge to generate mock optimization hypotheses when running in `MOCK_REASONING=true` mode, decoupling gateway integration from Mastra AI development.

## Technical Requirements
*   Create [mock-reasoning.ts](file:///Users/bugaro/projects/apo/backend/services/copilot-bridge/src/infrastructure/adapters/mock-reasoning.ts).
*   Implement `ReasoningClient`.
*   Define a deterministic layout optimization based on the `appId`:
    *   If `appId` matches App B (Fitness Tracker) and conversion rate is $< 3\%$, suggest lowering price to `"$7.99"`, swapping theme to `'dark-slate'`, and changing copywriting to `"Commit to your fitness today. Get 20% off forever."`.
    *   For other apps, return standard control values.

## QA & Validation
*   **Unit/Integration**:
    *   Write a unit test showing that calling `generateMutation` for App B returns the expected mock parameters.
*   **Manual/Automated Step**:
    *   Run `npm run test` or compile test to verify.
*   **Negative Test**:
    *   None.
*   **Boundary Check**:
    *   None.

## Observability Check
*   **Logging**:
    *   Log a warning when the mock adapter is loaded: `"Running in Mock Reasoning Mode — bypassing Mastra AI downstream requests."`.
*   **Metrics**:
    *   None.
