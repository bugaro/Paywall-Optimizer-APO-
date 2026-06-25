---
depends_on: []
---

# Issue: Add @ai-sdk/openai Dependency in copilot-bridge

## Context
To enable the Copilot Gateway (`copilot-bridge`) to route completions to the Mastra AI proxy, we need the Vercel AI SDK OpenAI provider (`@ai-sdk/openai`). Since the proxy exposes an OpenAI-compatible interface, we can use this provider with a custom `baseURL` pointing to the proxy.

## Technical Requirements
*   Add `@ai-sdk/openai` to the dependencies in `backend/services/copilot-bridge/package.json`.
*   Ensure the version matches the compatible Vercel AI SDK version currently used transitively by `@copilotkit/runtime` (e.g., `^3.0.0` or `^3.0.74` to match lockfile).
*   Run `npm install` inside the `copilot-bridge` service directory to update `package-lock.json`.

## QA & Validation
*   **Unit/Integration:** Validate that the package is present in `package.json` and resolved in `package-lock.json`.
*   **Manual Step:** Verify that importing `createOpenAI` from `@ai-sdk/openai` compiles without module resolution errors.

## Observability Check
*   No runtime logs or metrics changes required for this task.
