---
depends_on: ["11-server-setup"]
---

# Issue: Create Dockerfile for Mastra AI Service

## Context
To host the service inside our internal container network, we must create a Dockerfile that compiles the TypeScript code and starts the Hono server in production mode.

## Technical Requirements
- Create `services/mastra-ai/Dockerfile`:
  - Base image: `node:24-alpine` or standard LTS node image.
  - Setup working directory `/app`.
  - Copy `package.json` and `package-lock.json` and install dependencies.
  - Copy codebase and compile TypeScript via `npm run build`.
  - Prune devDependencies to keep the image lightweight.
  - Expose port `4006`.
  - Command: `CMD ["node", "dist/infrastructure/server.js"]`

## QA & Validation
- **Unit/Integration**: Build the docker image locally using `docker build -t apo-mastra-ai .` and verify the compilation completes cleanly.
- **Manual/Automated Step**: Spin up the built container standalone and ensure it binds to port 4006.
- **Negative Test**: N/A
- **Boundary Check**: N/A

## Observability Check
- N/A
