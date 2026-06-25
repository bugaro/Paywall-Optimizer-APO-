---
depends_on: ["11-server-setup"]
---

# Issue: Replace Mock Reasoning Adapter in Copilot Bridge

## Context
With the Mastra AI service running, the `copilot-bridge` gateway must shift from returning mock paywall mutations to sending real, synchronous HTTP requests downstream to the `mastra-ai` service.

## Technical Requirements
- Create `services/copilot-bridge/src/infrastructure/adapters/http-reasoning.ts` implementing `ReasoningClient` interface:
  - Constructor takes `baseUrl` (e.g., loaded from `MASTRA_AI_URL` env variable).
  - Implement `generateMutation(appId: string, currentMetrics: TelemetryMetrics)`:
    - Post an HTTP request to `${baseUrl}/api/reasoning/mutate` with JSON body containing `appId` and `currentMetrics`.
    - Pass forward the `correlationId` using the context header.
    - Set request timeout to `5000ms`.
    - Map response fields (`pricePoint` to `price`, `backgroundColor` to `theme`, copywriting) back to standard `PaywallMutation` output structure.
- Update `services/copilot-bridge/src/infrastructure/server.ts` to instantiate `HttpReasoningAdapter` when `MOCK_REASONING !== "true"`.

## QA & Validation
- **Unit/Integration**: Write integration test `tests/infrastructure/http-reasoning.test.ts` to mock the downstream HTTP endpoint and verify correct bridge mapping.
- **Manual/Automated Step**: Disable mock reasoning by setting `MOCK_REASONING=false` in the bridge environment, trigger the breach audit, and observe logs demonstrating communication between the bridge and `mastra-ai`.
- **Negative Test**: If the downstream request fails or times out, verify the bridge returns a graceful backup payload.
- **Boundary Check**: Ensure correlation ID matches exactly between incoming request headers to the bridge and outgoing request headers from the bridge to `mastra-ai`.

## Observability Check
- **Logging**: Log gateway outgoing actions:
  - `"Forwarding audit reasoning request downstream to Mastra AI service..."`
  - `"Received reasoning response from Mastra AI in <time_ms>"`
