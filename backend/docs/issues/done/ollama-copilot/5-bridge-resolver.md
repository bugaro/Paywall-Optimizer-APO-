---
depends_on: [3-bridge-dependencies, 4-bridge-constants]
---

# Issue: Implement resolveAgentModel resolver

## Context
The Copilot Gateway uses Hono to host the CopilotKit `BuiltInAgent`. We need to dynamically resolve the underlying model provider at startup based on the environment configuration, enabling us to swap from OpenAI to local Ollama via the Mastra Proxy.

## Technical Requirements
Modify `backend/services/copilot-bridge/src/infrastructure/server.ts`:
*   Import `createOpenAI` from `@ai-sdk/openai`.
*   Implement a helper function `resolveAgentModel()` that:
    1.  Reads `COPILOT_AGENT_PROVIDER` (default `'openai'`).
    2.  Reads `COPILOT_AGENT_MODEL` (default `'gpt-4o-mini'`).
    3.  If provider is `'ollama'`, reads `MASTRA_AI_URL` (default `'http://localhost:4006'`), instantiates the OpenAI-compatible provider using `createOpenAI({ apiKey: 'ollama', baseURL: `${mastraUrl}/api/reasoning/openai` })`, and returns the model instance.
    4.  If provider is `'openai'`, returns the concatenated string `openai:modelName` (or resolves the default standard provider string).
*   Pass the resolved model to the `BuiltInAgent` constructor instance.

## QA & Validation
*   **Unit/Integration:** Mock the environment variables (`COPILOT_AGENT_PROVIDER=ollama`) and assert that `resolveAgentModel` returns a `LanguageModel` instance containing the custom baseURL pointing to `mastra-ai`.
*   **Manual Step:** Boot up the Hono dev server with the custom configuration and verify that it starts without syntax/runtime compilation errors.
*   **Negative Test:** Set `COPILOT_AGENT_PROVIDER=invalid`. Verify that the resolver logs a warning and falls back cleanly to the default OpenAI model (`openai:gpt-4o-mini`).
*   **Boundary Check:** Ensure empty or malformed `MASTRA_AI_URL` values log an explicit warning or use a clean fallback to prevent uncaught runtime exceptions during start.

## Observability Check
*   **Logging:** Add a structured startup log when initializing the agent:
    `logger.info("Copilot agent initialized with provider=${provider}, model=${modelName}");`
