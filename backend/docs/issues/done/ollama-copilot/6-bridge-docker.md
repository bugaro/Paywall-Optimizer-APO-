---
depends_on: [5-bridge-resolver]
---

# Issue: Configure service environment in Docker Compose

## Context
To execute the gateway container locally inside the docker network, it needs the correct service DNS links and environment configurations so that it can resolve the `mastra-ai` container endpoint.

## Technical Requirements
Modify `backend/services/copilot-bridge/docker-compose.yml`:
*   Add `COPILOT_AGENT_PROVIDER`, `COPILOT_AGENT_MODEL`, and `MASTRA_AI_URL` environment variables under the `copilot-bridge` service environment section.
*   Assign default fallbacks so that if they aren't provided in the host shell, they default to using the docker network coordinates:
    *   `COPILOT_AGENT_PROVIDER: "${COPILOT_AGENT_PROVIDER:-openai}"`
    *   `COPILOT_AGENT_MODEL: "${COPILOT_AGENT_MODEL:-gpt-4o-mini}"`
    *   `MASTRA_AI_URL: "${MASTRA_AI_URL:-http://apo-mastra-ai:4006}"`
*   Ensure `copilot-bridge` has `apo-mastra-ai` in its `depends_on` list.
*   Ensure any direct dependency on the raw `ollama` container is removed from `copilot-bridge`'s service definition.

## QA & Validation
*   **Unit/Integration:** Validate the docker compose configuration structure by running `docker compose config`.
*   **Manual Step:** Start the docker container with `COPILOT_AGENT_PROVIDER=ollama` and `COPILOT_AGENT_MODEL=gemma4:e4b` enabled in the host. Run `docker compose up -d copilot-bridge`. Verify that the bridge resolves the hostname `http://apo-mastra-ai:4006` inside the container network.
*   **Negative Test:** Stop the `apo-mastra-ai` container and try to request a chat turn. Verify that `copilot-bridge` responds with `503 Service Unavailable` instead of hanging or crashing the container.

## Observability Check
*   No additional logs or metrics required for this docker compose task.
