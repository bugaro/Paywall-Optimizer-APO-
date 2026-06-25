# Telemetry & Analytics Service

The `telemetry-analytics` service is the core data ingestion, processing, and simulation engine for the Multi-Asset Autonomous Paywall Optimizer (APO).

## Key Features

- **High-Velocity Telemetry Ingestion**: Exposes a Hono HTTP API to ingest impressions, clicks, and purchase events.
- **Tumbling-Window Metric Aggregation**: Uses an RxJS-based stream pipeline to aggregate event metrics into 5-second tumbling windows, mitigating database write bottlenecks.
- **Deterministic User Segmentation**: Applies an FNV-1a sticky hashing algorithm to bucket users consistently into Control (`A`) or Test (`B`) groups based on their user ID and test name.
- **Traffic Simulator**: Features a built-in virtual user simulator that models realistic mobile app user behaviors, cohort overlap behaviors, subscription boost/decay effects, and routes events back into the ingestion API.

## Tech Stack

- **Runtime**: Node 24 (using native TypeScript stripping via `--experimental-strip-types`)
- **Web Framework**: [Hono](https://hono.dev/) with Node Server adapter
- **Database Access**: [Drizzle ORM](https://orm.drizzle.team/) with `pg` driver communicating with PostgreSQL
- **Testing**: [Vitest](https://vitest.dev/)
- **Observability**: Pino for JSON logging, Prometheus for application metrics (`prom-client`), Loki and Alloy for log forwarding.

## Getting Started

### Prerequisites

- Node.js `v24.x` or later
- Docker & Docker Compose

### Setup

1. **Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. **Start Infrastructure**:
   Boot up the Postgres and Grafana/Prometheus/Loki/Alloy stack:
   ```bash
   docker compose up -d
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Run Database Migrations & Push Schema**:
   Use Drizzle Kit to push the schema changes to the local PostgreSQL database:
   ```bash
   npx drizzle-kit push
   ```

5. **Start Dev Server**:
   Runs the server with hot reloading enabled:
   ```bash
   npm run dev
   ```

## Development & Scripts

- `npm run dev`: Starts Hono server using Node 24's native TypeScript support.
- `npm run build`: Compiles TypeScript files to the `dist` directory.
- `npm run test`: Executes unit and integration tests via Vitest.
- `npm run test:e2e`: Runs integration test specifications (`tests/e2e.test.ts`).

## Architecture Layout

Following Hexagonal Architecture / DDD principles:
- **`src/domain`**: Framework-agnostic pure logic, entity definitions (`entities.ts`), domain errors (`errors.ts`), and hashing logic (`segmentation.ts`).
- **`src/application`**: Defines ports (`ports/`) and core use cases, including the RxJS `MetricsAggregator` (`use-cases/metrics-aggregator.ts`).
- **`src/infrastructure`**: Concrete adapters, including PostgreSQL/Drizzle database mapping (`db/`), Hono HTTP endpoint routers (`http/`), and RxJS Traffic Simulator worker (`simulator/`).
