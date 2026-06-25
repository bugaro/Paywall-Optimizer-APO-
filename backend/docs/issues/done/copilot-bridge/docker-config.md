---
depends_on: [http-server]
---

# Issue: Configure Docker Compose Service Definition

## Context
This task integrates the `copilot-bridge` container into the active Docker Compose configuration, enabling it to run as a microservice in the local network environment.

## Technical Requirements
*   Create `Dockerfile` inside `/Users/bugaro/projects/apo/backend/services/copilot-bridge/`.
*   Modify `/Users/bugaro/projects/apo/backend/infrastructure/docker-compose.yml`.
*   Add a new service definition `copilot-bridge`:
    *   Set container name: `copilot-bridge`.
    *   Map port `4005:4005`.
    *   Set environment variables: `TELEMETRY_ANALYTICS_URL=http://apo-telemetry-analytics:4003`, `PORT=4005`, `MOCK_REASONING=true`, `NODE_ENV=development`.
    *   Configure `depends_on` referencing `apo-telemetry-analytics`.
*   Ensure container connects to the standard docker network.

## QA & Validation
*   **Unit/Integration**:
    *   None.
*   **Manual/Automated Step**:
    *   Run `docker compose build copilot-bridge` followed by `docker compose up -d copilot-bridge`.
    *   Run `docker compose ps` to verify container is healthy on port `4005`.
*   **Negative Test**:
    *   Spin up the container without `apo-telemetry-analytics` running. The gateway should still start and serve `/metrics`, but action triggers will log errors.
*   **Boundary Check**:
    *   None.

## Observability Check
*   None.
