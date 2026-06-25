---
depends_on: ["03-domain-types"]
---

# Issue: Configure Ollama Embedding and Chat Generation Adapter

## Context
The AI reasoning logic requires communicating with the Ollama container to generate embeddings (using `all-minilm`) and chat layouts (using `gemma:4b`). We use Mastra's Ollama provider integration to abstract these model requests.

## Technical Requirements
- Create `services/mastra-ai/src/infrastructure/adapters/ollama-llm.adapter.ts`:
  - Initialize Mastra Ollama models or use the `ollama-ai-provider-v2` compatibility library.
  - Implement an `EmbeddingAdapter` that calls the Ollama embedding API (`all-minilm`) to convert failure text strings to 384-length float arrays.
  - Implement a `LlmReasoningAdapter` that sends grounding facts and current cohort metrics to `gemma:4b`.
  - Use `jsonPromptInjection: true` and pass `AbHypothesisSchema` to guarantee strict JSON schema compliance.
  - Set `temperature: 0` for deterministic structured output formatting.

## QA & Validation
- **Unit/Integration**: Write integration test `tests/infrastructure/ollama-llm.test.ts` mocking the Ollama HTTP responses.
- **Manual/Automated Step**: Run `vitest run tests/infrastructure/ollama-llm.test.ts` to verify the adapter maps payload requests/responses correctly.
- **Negative Test**: Mock an Ollama network disconnect and verify the adapter throws a standard adapter timeout error.
- **Boundary Check**: Test with empty inputs or large textual failure descriptions to verify truncation or request sizing.

## Observability Check
- **Logging**: Log model execution parameters:
  - `"Requesting embedding for condition: <text>"`
  - `"Requesting LLM proposal from gemma:4b..."`
  - `"Model inference succeeded in <time_ms>"`
