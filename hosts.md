# Service Directory & Host Map

This file serves as the service discovery map for the Multi-Asset Autonomous Paywall Optimizer (APO) project.

## Active Container Services

These services are defined in the Docker Compose configurations and run locally.

| Service Name | Docker Container Name | Internal Endpoint (Docker Network) | External Endpoint (Local Host) | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Telemetry & Analytics Engine** | `apo-telemetry-analytics` | `apo-telemetry-analytics:4003` | `http://localhost:4003` | Core data-reactive Hono/TypeScript microservice for paywall simulations, A/B test splits, and event stream aggregation. |
| **Copilot Gateway (Bridge)** | `copilot-bridge` | `copilot-bridge:4005` | `http://localhost:4005` | Relays frontend/CopilotKit presentation layer requests to the backend and handles tool/agent execution orchestration. |
| **Telemetry PostgreSQL Database** | `apo-postgres` | `apo-postgres:5432` | `localhost:5432` (or `:5436`) | Relational database storing application setups, user cohorts, and telemetry events. |
| **Mastra AI Service** | `apo-mastra-ai` | `apo-mastra-ai:4006` | `http://localhost:4006` | Vector similarity search retrieval, paywall layout mutation reasoning using RAG, and OpenAI-compatible Ollama proxy. |
| **Mastra PostgreSQL Database** | `apo-mastra-db` | `apo-mastra-db:5432` | `localhost:5437` | Dedicated Postgres DB with pgvector support for Mastra RAG semantic vector memory. |
| **Ollama Runtime** | `apo-ollama` | `ollama:11434` | `http://localhost:11434` | Runs local LLM inference engines (e.g., Qwen2.5:3b) for layout mutation generation. |
| **Grafana** | `grafana` | `grafana:3000` | `http://localhost:3000` | Metrics visualization dashboard. (Default credentials: `admin` / `admin`) |
| **Prometheus** | `prometheus` | `prometheus:9090` | `http://localhost:9090` | Timeseries database collecting application metrics. |
| **Grafana Loki** | `loki` | `loki:3100` | `http://localhost:3100` | Log aggregation engine. |
| **APO Frontend** | `apo-frontend` | `apo-frontend:80` | `http://localhost:5173` (dev) / `http://localhost:80` (prod) | Vite + React 19 SPA with Feature-Sliced Design. Real-time metrics dashboard, AI Copilot sidebar, and HITL A/B test controls. |
| **Drizzle Studio (Telemetry)** | `apo-drizzle-studio-telemetry` | `apo-drizzle-studio-telemetry:4983` | `https://local.drizzle.studio?port=4983` | Browser-based Drizzle ORM GUI for the telemetry-analytics database (`apo_telemetry`). |
| **Drizzle Studio (Mastra AI)** | `apo-drizzle-studio-mastra` | `apo-drizzle-studio-mastra:4984` | `https://local.drizzle.studio?port=4984` | Browser-based Drizzle ORM GUI for the Mastra AI vector memory database (`mastra_memory`). |
| **Grafana Alloy** | `alloy` | `alloy:12345` | `http://localhost:12345` | Telemetry agent and pipeline processor. |

---

## Planned/Architectural Services

All primary services described in the architecture are currently implemented and running in active docker containers.
