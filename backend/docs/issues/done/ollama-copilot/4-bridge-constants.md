---
depends_on: []
---

# Issue: Add Mastra Proxy default constants

## Context
To configure the new local Ollama provider option, we must declare the default environment configurations (like default model name, default Mastra Proxy URL, and provider keys) in a central location so that the bootstrap routing logic can reference them.

## Technical Requirements
Modify `backend/services/copilot-bridge/src/domain/constants.ts`:
*   Add provider option configurations:
    *   `AGENT_PROVIDERS = { OPENAI: 'openai', OLLAMA: 'ollama' } as const`.
    *   Default model identifier for Ollama: `'gemma4:e4b'`.
    *   Default fallback Mastra Proxy URL: `'http://localhost:4006/api/reasoning/openai'`.

## QA & Validation
*   **Unit/Integration:** Import constants in a test file and assert their values match the defaults.
*   **Manual Step:** Verify the file compiles cleanly using TypeScript compiler (`tsc`).

## Observability Check
*   No runtime logs or metrics changes required for this task.
