# Multi-Asset Autonomous Paywall Optimizer (APO) — Backend

This directory houses the backend microservices, configuration, and developer documentation for the Multi-Asset Autonomous Paywall Optimizer (APO).

## Directory Structure

```
backend/
├── .agents/                    # Developer agent skills and behavior configs
├── docs/                       # Technical specs, PRDs, and architecture documents
│   ├── PRD/                    # Product Requirements Documents
│   ├── issues/                 # Issue trackers for services
│   ├── app.md                  # Overarching system specification
│   ├── architecture.md         # Clean Architecture & DDD design details
│   ├── coding_standards.md     # Code guidelines and rules
│   └── ubiquitous_language.md  # Ubiquitous language definition
├── services/                   # Active microservices
│   ├── telemetry-analytics/    # Core ingestion and simulation service (Hono/TypeScript)
│   ├── copilot-bridge/         # CopilotKit agent gateway and mock reasoning client (Hono/TypeScript)
│   └── mastra-ai/              # Vector store retrieval & LLM reasoning engine (Hono/TypeScript)
├── infrastructure/             # Docker Compose configs and observability stack
│   └── docker-compose.yml      # Central orchestrator (includes frontend)
├── hosts.md                    # Service directory and port map
└── .env.example                # Global environment variables template

frontend/                       # Standalone SPA (Vite + React 19 + TypeScript)
└── src/                        # Feature-Sliced Design architecture
    ├── app/                    # Entry point, providers, global CSS
    ├── pages/                  # Page composition (DashboardPage)
    ├── widgets/                # Composed UI blocks (MetricsChart, AppSelector, CopilotSidebar)
    ├── features/               # Business actions (InitiateAbTest)
    ├── entities/               # Domain models with Zustand stores (Application, Experiment, Metrics)
    └── shared/                 # UI kit, API client, logger, constants
```

## System Requirements

- **Node.js**: `v24.x` or later (leveraging native TypeScript stripping)
- **Docker & Docker Compose**: For local infrastructure services (PostgreSQL, Grafana, Prometheus, Loki)

## Tech Stack & Core Services

1. **Telemetry & Analytics Engine (`telemetry-analytics`)**:
   - Port: `4003`
   - Runtime: Node 24 with Hono web framework.
   - Database: PostgreSQL with Drizzle ORM.
   - Core Features: RxJS-based tumbling window telemetry aggregation, deterministic FNV-1a sticky segmentation, and user cohort A/B test split testing.
2. **Copilot Gateway Service (`copilot-bridge`)**:
   - Port: `4005`
   - Runtime: Node 24 with Hono web framework and CopilotKit SDK runtime.
   - Core Features: Exposes the AI agent orchestration interface, registers A/B testing and breach remediation tools, and handles downstream communications.
3. **Mastra AI Reasoning Service (`mastra-ai`)**:
   - Port: `4006`
   - Runtime: Node 24 with Hono web framework and Mastra.ai SDK.
   - Core Features: Cosine semantic vector similarity search on historical mutations via pgvector, local LLM (Qwen2.5:3b) reasoning integration via Ollama, and target paywall mutation generation.
4. **PostgreSQL Databases**:
   - `apo-postgres`: Stores application cohort states, users, and telemetry events.
   - `apo-mastra-db`: Dedicated database with pgvector for the Mastra reasoning vector memory store.
5. **APO Frontend**:
   - Port: `5173` (dev) / `80` (Docker)
   - Runtime: Node 24 with Vite + React 19 + TypeScript.
   - Architecture: Feature-Sliced Design with Zustand stores, typed API client, and CopilotKit sidebar integration.
6. **Observability Stack**:
   - **Prometheus** & **Grafana**: Real-time metrics scraper and visualization.
   - **Loki** & **Alloy**: Log ingestion and parsing.

## Getting Started

1. **Copy Environment Configurations**:
   ```bash
   cp .env.example .env
   cd services/telemetry-analytics && cp .env.example .env
   cd ../copilot-bridge && cp .env.example .env
   cd ../mastra-ai && cp .env.example .env
   ```
   *(Note: Ensure your `.env` configuration keys match your local port setup if you customize them).*

2. **Launch Infrastructure & Services (Zero-Configuration)**:
   Ensure the Docker daemon is active, then initialize the entire ecosystem from the infrastructure directory:
   ```bash
   cd ../../infrastructure
   docker compose up -d
   ```
   *This command spins up the `apo-dependency-check` bootstrap container first. It automatically copies `.env.example` templates to `.env` and installs Node modules for the frontend and all backend services. Once it completes successfully, the other services (databases, Ollama, microservices, and the frontend) start. Telemetry databases are automatically migrated and seeded with mock user cohorts and embedding vectors.*

3. **Install Dependencies (Only needed for local/outside-Docker development)**:
   If you plan to run services directly on your host machine, install dependencies manually:
   ```bash
   cd ../services/telemetry-analytics && npm install
   cd ../copilot-bridge && npm install
   cd ../mastra-ai && npm install
   cd ../../../frontend && npm install
   ```

4. **Run Database Migrations & Seeding (Only needed for local/outside-Docker development)**:
   From the `telemetry-analytics` folder:
   ```bash
   npm run db:push
   ```
   *(Note: Databases running in Docker compose are migrated and seeded automatically on startup).*

5. **Start Dev Servers (if running services outside Docker)**:
   - For Telemetry service:
     ```bash
     cd ../telemetry-analytics
     npm run dev
     ```
   - For Copilot Bridge service:
     ```bash
     cd ../copilot-bridge
     npm run dev
     ```
   - For Mastra AI service:
      ```bash
      cd ../mastra-ai
      npm run dev
      ```
   - For Frontend:
      ```bash
      cd ../../../frontend
      npm run dev
      ```
      *The Vite dev server starts on `localhost:5173` with automatic proxy: `/api` → `:4003`, `/copilot` → `:4005`.*


For detailed service endpoints and port maps, see [hosts.md](file:///Users/bugaro/projects/apo/backend/hosts.md).
For architecture diagrams, see [architecture.md](file:///Users/bugaro/projects/apo/backend/docs/architecture.md).
