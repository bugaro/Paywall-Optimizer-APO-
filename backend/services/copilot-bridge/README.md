# Copilot Gateway Service

The `copilot-bridge` service is the AI-native gateway for the Multi-Asset Autonomous Paywall Optimizer (APO). It acts as the bridge between the React frontend (utilizing the CopilotKit SDK) and downstream services (the Telemetry & Analytics Engine, and the reasoning components).

## Key Features

- **CopilotKit Runtime Integration**: Exposes the `@copilotkit/runtime/v2` endpoint to orchestrate LLM execution and agent state tracking.
- **Built-in Agent & Tooling**: Configures an autonomous agent with specialized tools to audit performance and initiate experiments.
- **Mock Reasoning Mode**: Simulates LLM analysis to determine optimal paywall mutations when conversion rates breach baseline thresholds.
- **Downstream Resiliency**: Implements timeouts, error propagation, and failure counters for calls to `telemetry-analytics`.
- **Observability**: Includes Prometheus request counting/duration metrics and context-propagated correlation ID tracking.

## Tech Stack

- **Runtime**: Node 24 (with native TypeScript stripping support)
- **Web Framework**: [Hono](https://hono.dev/) with Node Server adapter
- **Agent SDK**: [CopilotKit Runtime SDK](https://docs.copilotkit.ai/)
- **Testing**: [Vitest](https://vitest.dev/)
- **Observability**: prom-client for Prometheus metrics, Pino for structured logging.

## Getting Started

### Setup

1. **Environment Variables**:
   Copy `.env.example` to `.env` (configured inside `backend/services/copilot-bridge/`):
   ```bash
    PORT=4005
    TELEMETRY_ANALYTICS_URL=http://localhost:4003
    MOCK_REASONING=true
    NODE_ENV=development
    COPILOT_AGENT_PROVIDER=openai # Set to 'openai' or 'ollama'
    COPILOT_AGENT_MODEL=gpt-4o-mini # Set model name (e.g., 'gpt-4o-mini' or 'qwen2.5:3b')
    MASTRA_AI_URL=http://localhost:4006 # URL of the Mastra AI service for Ollama proxy calls
    ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   The service will start listening on port `4005` by default.

## Service Endpoints

- **`POST /copilot/chat`**: The main endpoint for CopilotKit presentation layer requests.
- **`GET /metrics`**: Exposes Prometheus-formatted metrics including HTTP request counts and durations.

## Copilot Agent Tools

The agent is equipped with the following execution tools:

### 1. `initiateAbExperiment`
Initiates a new A/B split test with a specific paywall layout mutation on the Telemetry engine.
- **Arguments**:
  - `appId` (`string`): The UUID of the application.
  - `sampleSizePercent` (`number`): Percentage of traffic to isolate (0 to 100).
  - `mutation` (`object`): Details of the paywall change:
    - `price` (`string`): e.g. `"$7.99"`
    - `theme` (`light` | `dark-slate`): Visual design theme.
    - `ctaCopy` (`string`): Call to action copywriting text.

### 2. `remediateBreach`
Audits application performance and generates a paywall layout optimization proposal based on metrics.
- **Arguments**:
  - `appId` (`string`): The UUID of the application to audit.
- **Returns**:
  - `metrics`: Total impressions, clicks, conversions, and conversion rate.
  - `mutation`: The proposed layout parameters.
  - `cardType`: The presentation card identifier (`PaywallExperimentCard`).

## Directory Layout

Following Clean Architecture and DDD principles:
- **`src/domain`**: Contains entities (`types.ts`), error definitions (`errors.ts`), and global constants/defaults (`constants.ts`).
- **`src/application`**: Defines ports (`ports.ts`) mapping out downstream service contracts.
- **`src/infrastructure`**: Concrete adapters for telemetry communication (`adapters/telemetry.ts`), reasoning logic (`adapters/mock-reasoning.ts`), and the Hono HTTP server bootstrap (`server.ts`).
