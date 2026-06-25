---
depends_on: ["FE-10"]
---

# Issue: FE-11: Integrate Frontend Service into Docker Compose Orchestration

## Context
Orchestrate the frontend alongside the existing telemetry, postgres, and copilot services.

## Technical Requirements
* Update `backend/infrastructure/docker-compose.yml` (or equivalent).
* Define the `frontend` service container:
  * Mount directory contexts, expose port `80` to host, and assign to the shared docker internal network.
  * Ensure the container starts after backend microservices dependencies are healthy.

## QA & Validation
* **Manual Step**: Execute `docker compose up --build` and verify all microservices start up in correct order.
* **Boundary Check**: Ensure that frontend network calls route successfully to telemetry and copilot containers without DNS resolution errors.

## Observability Check
* Health check outputs in docker daemon confirming frontend container is online.
