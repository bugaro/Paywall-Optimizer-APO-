---
depends_on: ["12-dockerfile"]
---

# Issue: Integrate Services into Docker Compose Network

## Context
We must hook the `mastra-ai` service and its dedicated PostgreSQL database (`apo-mastra-db`) into the central docker-compose configuration.

## Technical Requirements
- Create/modify Docker Compose definitions:
  - Create `services/mastra-ai/docker-compose.yml`:
    - Define `apo-mastra-ai`:
      - Build context: `.`
      - Environment: `DATABASE_URL`, `PORT=4006`, `OLLAMA_URL=http://ollama:11434`
      - Port: `4006:4006`
      - Depends on: `apo-mastra-db`
    - Define `apo-mastra-db`:
      - Image: `ankane/pgvector:v0.5.1`
      - Port: `5437:5432`
      - Environment: `POSTGRES_DB=mastra_memory`, `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=password`
  - Update `backend/infrastructure/docker-compose.yml` to include the path `../services/mastra-ai/docker-compose.yml` in its `include` block.

## QA & Validation
- **Unit/Integration**: Check docker-compose YAML syntax validation.
- **Manual/Automated Step**: Run `docker compose up -d` in the `backend/infrastructure` directory and verify both containers boot successfully on ports `4006` and `5437`.
- **Negative Test**: If the database starts up after the app container, verify that the app container healthcheck waits, or retries connection until it is active.
- **Boundary Check**: Verify networking by pinging the Ollama service container and DB container from within the `apo-mastra-ai` shell.

## Observability Check
- **Logging**: Docker daemon logs should report standard startup steps.
