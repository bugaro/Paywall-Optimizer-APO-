---
depends_on: ["FE-01"]
---

# Issue: FE-02: Configure Vite Dev Server with Proxy Routing

## Context
To prevent CORS issues in development, the frontend dev server must proxy local API requests to the respective backend services.

## Technical Requirements
* Create `frontend/vite.config.ts`.
* Set up proxy mappings in Vite server config:
  * Route `/api/*` to `http://localhost:4003` (telemetry-analytics engine).
  * Route `/copilot/*` to `http://localhost:4005` (copilot-bridge gateway).
* Enable CORS header passing and WebSocket/SSE support for Copilot streams.

## QA & Validation
* **Integration**: Call `/api/metrics` on `localhost:5173` and verify it successfully proxies to `localhost:4003` without CORS blocks.
* **Boundary Check**: Ensure that requests larger than 10MB (if any) do not trigger proxy connection drops or payload size limits.

## Observability Check
* Vite server logs print backend routing maps on initialization.
