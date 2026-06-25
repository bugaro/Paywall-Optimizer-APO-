---
depends_on: ["07-vector-store-port", "09-ollama-llm-adapter"]
---

# Issue: Implement Proposal Generation Use Case

## Context
The core business logic resides in the application use-case, which orchestrates the flow of data: generating failure embeddings, querying the vector database for historical matches (RAG), grounding the system prompt, triggering LLM synthesis, and enforcing formatting fallbacks.

## Technical Requirements
- Create `services/mastra-ai/src/application/use-cases/generate-proposal.use-case.ts`:
  - Input: `appId: string`, `metrics: TelemetryMetrics`.
  - Process:
    1. Construct failure text: `"App ID ${appId} conversion rate is ${metrics.conversionRate * 100}%, breaching 3% threshold. Impressions: ${metrics.impressions}, conversions: ${metrics.conversions}."`
    2. Request embedding vector from `EmbeddingPort`.
    3. Query `VectorStorePort` for the top 3 similar past mutations.
    4. Compile the system prompt grounding Gemma 4b with these 3 historical paywall layout mutations and their conversion rates.
    5. Run structured generation with Zod schema configuration (`AbHypothesisSchema`).
    6. Implement retry loop (1 retry) on validation error.
    7. Implement fallback: if reasoning fails or times out, return a baseline mutation (`MOCK_OPTIMIZED_MUTATION` format parameters).
  - Output: `AbHypothesis` mapped to public `PaywallMutation` contract format.

## QA & Validation
- **Unit/Integration**: Write unit test `tests/application/generate-proposal.test.ts` mocking both the vector database and the LLM ports.
- **Manual/Automated Step**: Run `vitest run tests/application/generate-proposal.test.ts`.
- **Negative Test**: Mock the LLM to return invalid JSON twice. Verify the use-case catches the exception and returns the fallback mutation instead of crashing.
- **Boundary Check**: If no vector database matches are returned (empty DB), verify that the LLM is called with a zero-shot prompt template.

## Observability Check
- **Logging**: Log execution state:
  - `"Generating proposal for app <appId>..."`
  - `"Retrieved <count> grounding facts for prompt..."`
  - `"Structured proposal generated successfully."`
  - `"LLM failed to comply with schema. Executing retry..."`
  - `"Remediation proposal generation failed. Returning baseline fallback."`
- **Metrics**: Update `mastra_ai_proposal_duration_seconds` and `mastra_ai_proposal_failures_total`.
