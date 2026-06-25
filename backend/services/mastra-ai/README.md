# Mastra AI Service (`apo-mastra-ai`)

The **Mastra AI Service** is the reasoning and optimization core of the Multi-Asset Autonomous Paywall Optimizer (APO). When a cohort's conversion rate breaches performance baselines, this service retrieves relevant historical mutation context using pgvector semantic search (RAG) and prompts a local LLM to generate remediation hypotheses.

---

## Technical Stack

- **Runtime**: Node.js v24 (utilizing native TypeScript type stripping via `--experimental-strip-types`)
- **API Framework**: [Hono](https://hono.dev/)
- **LLM/Embeddings Interface**: [Mastra.ai SDK](https://mastra.ai/) + local [Ollama](https://ollama.com/) daemon
- **ORM & Vector Database**: [Drizzle ORM](https://orm.drizzle.team/) + PostgreSQL with `pgvector` extension
- **Observability**: OpenTelemetry (OTel) Node SDK (with HttpInstrumentation) + Prometheus client
- **Testing**: [Vitest](https://vitest.dev/)

---

## Directory Structure

```
mastra-ai/
├── src/
│   ├── domain/               # Core schemas, constants, and types (framework-agnostic)
│   ├── application/          # Orchestration layer
│   │   ├── ports/            # Interfaces for LLM and Vector Store adapters
│   │   └── use-cases/        # GenerateRemediationProposal orchestrator
│   └── infrastructure/       # HTTP server, DB connection, and adapters
│       ├── adapters/         # Drizzle Vector Store and Ollama LLM implementations
│       ├── db/               # Drizzle schemas, migrations, and seeding scripts
│       ├── logger.ts         # Pino structured logging with AsyncLocalStorage correlation tracking
│       ├── metrics.ts        # Prometheus metrics definition
│       ├── otel.ts           # OpenTelemetry SDK bootstrap
│       └── server.ts         # Service bootstrap and Hono entrypoint
├── tests/                    # Integration and unit tests
├── Dockerfile                # Multi-stage production container build
├── docker-compose.yml        # Service dependencies (db, ollama, ollama-init model puller)
└── package.json              # Service configuration and dependencies
```

---

## Configuration

The service is configured using environment variables. Copy the example configuration to start:

```bash
cp .env.example .env
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `4006` | Port Hono server listens on. |
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`). |
| `DATABASE_URL` | `postgres://postgres:password@localhost:5437/mastra_memory` | Postgres connection string with pgvector support. |
| `OLLAMA_URL` | `http://localhost:11434` | Endpoint of the Ollama inference engine. |
| `LOG_LEVEL` | `info` | Minimum log output verbosity. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://alloy:4317` | OpenTelemetry collector gRPC endpoint. |
| `SERVICE_NAME` | `mastra-ai` | Traced service name resource attribute. |

---

## Available Scripts

- **`npm run dev`**: Starts the Hono server in watch-mode, executing typescript files directly using native Node.js v24 type stripping.
- **`npm run build`**: Compiles TypeScript files into the `dist` directory.
- **`npm run start`**: Runs the compiled JavaScript service using type stripping flags.
- **`npm test`**: Runs the vitest test suite.
- **`npx drizzle-kit push`**: Syncs the local schema changes directly with the postgres database.

*Note: The server executes migrations (`runMigrations()`) automatically upon booting in production/development, meaning you do not need to manually push schemas on first run.*

---

## API Endpoints

For a detailed specification of the request/response payloads, refer to the [API Reference](../../docs/API.md).

- **`POST /api/reasoning/mutate`**: Accepts current app telemetry metrics, triggers pgvector RAG, and queries Qwen2.5:3b to return a structured paywall layout mutation proposal.
- **`ALL /api/reasoning/openai/*`**: OpenAI-compatible API reverse proxy routing completions/embeddings requests downstream to Ollama.
- **`GET /health`**: Standard operational health check.
- **`GET /metrics`**: Serves Prometheus metrics for scraper consumption (includes the `downstream_failures_total` counter for failed proxy requests).
