---
depends_on: []
---

# Issue: Set Up copilot-bridge Service and Dependencies

## Context
This task initializes the `copilot-bridge` service structure and installs all necessary dependencies. This service coordinates interactive AI optimization requests between the frontend client and internal microservices.

## Technical Requirements
*   Create directory `/Users/bugaro/projects/apo/backend/services/copilot-bridge`.
*   Create [package.json](file:///Users/bugaro/projects/apo/backend/services/copilot-bridge/package.json) containing:
    *   `hono` (for HTTP routing).
    *   `pino` (for structured logging).
    *   `@copilotkit/runtime` or `@copilotkit/sdk` (for CopilotKit backend).
    *   `prom-client` (for Prometheus metrics).
    *   TypeScript dependencies (`typescript`, `@types/node`).
*   Create [tsconfig.json](file:///Users/bugaro/projects/apo/backend/services/copilot-bridge/tsconfig.json) configured for Node 24 native TypeScript execution.

## QA & Validation
*   **Unit/Integration**:
    *   Verify that `package.json` is a valid JSON file.
*   **Manual/Automated Step**:
    *   Run `npm install` and verify all dependencies resolve successfully.
*   **Negative Test**:
    *   Attempting to start the service without typescript installed should fail early.
*   **Boundary Check**:
    *   None.

## Observability Check
*   None.
