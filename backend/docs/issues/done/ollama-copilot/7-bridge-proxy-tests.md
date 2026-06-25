---
depends_on: [5-bridge-resolver]
---

# Issue: Create unit tests for proxy routing

## Context
We need automated tests to verify that the `resolveAgentModel` helper function correctly resolves the model configuration under different environment profiles (OpenAI vs. Ollama via Mastra Proxy) and handles fallbacks robustly.

## Technical Requirements
Create `backend/services/copilot-bridge/tests/ollama-proxy.test.ts`:
*   Import the resolver function `resolveAgentModel`.
*   Create a test suite using `vitest` covering:
    1.  **OpenAI Resolution:** Sets `COPILOT_AGENT_PROVIDER=openai` and verifies that the returned model value is a string (e.g. `'openai:gpt-4o-mini'`).
    2.  **Ollama Resolution:** Sets `COPILOT_AGENT_PROVIDER=ollama` and `COPILOT_AGENT_MODEL=gemma4:e4b` and verifies that it returns a LanguageModel instance with the baseURL property configured to the environment's `MASTRA_AI_URL`/api/reasoning/openai endpoint.
    3.  **Invalid Configuration Fallback:** Sets `COPILOT_AGENT_PROVIDER=invalid` and asserts that it falls back to standard `'openai:gpt-4o-mini'`.

## QA & Validation
*   **Unit/Integration:** Execute the newly created test suite via `npm run test` or `vitest run tests/ollama-proxy.test.ts` and verify that all test cases pass.
*   **Manual Step:** Run the tests in watch mode and assert changes reload quickly without memory leaks.
*   **Negative Test:** Verify that when `MASTRA_AI_URL` is empty, it uses the default fallback.

## Observability Check
*   No additional logs or metrics are required for tests.
