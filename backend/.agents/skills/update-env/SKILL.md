---
name: update-env
description: Update environment files with newly discovered variables.
---

# Environment Variables Updater

Whenever new services, ports, or configuration values are added to the architecture or docker-compose files, extract them to central `.env` configurations.

## Instructions
1. Analyze all `docker-compose.yml` files, configuration files, and architecture docs to identify new variables.
2. Update the master template `backend/.env.example`.
3. Update the active configuration in `backend/infrastructure/.env`.
4. Ensure all `docker-compose.yml` files use Bash-style string interpolation (e.g., `${NEW_VAR:-default}`).
5. Provide local `.env.example` files in individual service directories if they support standalone local development.
6. **Healthcheck Logic**: Verify that any new environment variables used for external dependencies (e.g., DB_HOST, MQ_PORT) are reflected in the corresponding `docker-compose.yml` healthcheck/test commands.
