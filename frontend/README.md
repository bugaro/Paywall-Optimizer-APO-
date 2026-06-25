# Multi-Asset Autonomous Paywall Optimizer (APO) — Frontend

A standalone Single-Page Application (SPA) providing an interactive control room and real-time dashboard for managing autonomous paywall optimizations across mobile properties.

Built with **Vite**, **React 19**, **TypeScript**, and styled using **TailwindCSS 4.0-alpha**.

---

## Key Features

- **Fleet Overview & Real-Time Metrics**: Visualizes telemetry averages (Impressions, Clicks, Purchases, and Conversion Rates) in 5-second tumbling windows using Recharts.
- **AI Copilot Sidebar**: Integrates CopilotKit enabling users to chat with the LLM (Qwen2.5:3b via Ollama), review suggested paywall layout variants (Control vs. Proposed Variant), and initiate tests.
- **Human-in-the-Loop A/B Test Forking**: Lets users adjust a traffic isolation slider (e.g. 10% test sample size) and launch experiments on the fly.
- **Dynamic Chart Forking**: Renders split chart views comparing the control population against the isolated test population in real time.

---

## Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 6](https://vite.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **State Management**: [Zustand 5](https://github.com/pmndrs/zustand)
- **Charting**: [Recharts 2](https://recharts.org/)
- **Styling**: [TailwindCSS 4.0-alpha](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Agent Integration**: [CopilotKit React SDK](https://docs.copilotkit.ai/)
- **Testing**: [Vitest](https://vitest.dev/) and [jsdom](https://github.com/jsdom/jsdom)

---

## Directory Architecture

The frontend follows the **Feature-Sliced Design (FSD)** pattern, which structures code around business logic boundaries:

- **`src/app/`**: Composition root, global providers, and core styles.
  - [main.tsx](file:///Users/bugaro/projects/apo/frontend/src/app/main.tsx) — Mounts the React application.
  - [index.css](file:///Users/bugaro/projects/apo/frontend/src/app/index.css) — Custom Tailwind styling and CSS custom properties (dark theme).
- **`src/pages/`**: Complete page templates.
  - [DashboardPage.tsx](file:///Users/bugaro/projects/apo/frontend/src/pages/dashboard/DashboardPage.tsx) — The central control room dashboard.
- **`src/widgets/`**: Composed UI components combining entities and features.
  - [MetricsChart.tsx](file:///Users/bugaro/projects/apo/frontend/src/widgets/metrics-chart/ui/MetricsChart.tsx) — Real-time telemetry grid and Recharts visualizer.
  - [CopilotSidebar.tsx](file:///Users/bugaro/projects/apo/frontend/src/widgets/copilot-sidebar/ui/CopilotSidebar.tsx) — Sidebar client wrapper integrating CopilotKit's chat context.
- **`src/entities/`**: Domain models, logic, and state stores.
  - [application/model/store.ts](file:///Users/bugaro/projects/apo/frontend/src/entities/application/model/store.ts) — Persists selected application and hosts mock properties.
  - [metrics/model/store.ts](file:///Users/bugaro/projects/apo/frontend/src/entities/metrics/model/store.ts) — Manages real-time metric polling, stale guards, and variant aggregation.
  - [theme/model/store.ts](file:///Users/bugaro/projects/apo/frontend/src/entities/theme/model/store.ts) — Syncs visual theme settings (light vs. dark-slate) across the workspace.
- **`src/shared/`**: Common UI components, API clients, and helper libraries.
  - `shared/api/` — Structured API client with correlation tracking and custom errors.
  - `shared/lib/` — Structured logger and constant definitions.

---

## Getting Started

### Development Mode

1. **Install Dependencies**:
   Ensure you have installed node modules:
   ```bash
   npm install
   ```
2. **Launch Dev Server**:
   ```bash
   npm run dev
   ```
   The application will start on `http://localhost:5173`.
3. **API Proxy**:
   The Vite configuration [vite.config.ts](file:///Users/bugaro/projects/apo/frontend/vite.config.ts) is configured to proxy requests automatically:
   - `/api/*` → `http://localhost:4003` (Telemetry engine)
   - `/copilot/*` → `http://localhost:4005` (Copilot bridge)
   - `/metrics` → `http://localhost:4003` (Telemetry endpoints)

### Running Tests

Execute the unit and component test suites with Vitest:
```bash
npm run test
```

### Production Build

Compile the TypeScript files and bundle the production assets using Vite:
```bash
npm run build
```
To preview the compiled assets locally:
```bash
npm run preview
```

### Containerized Deployment (Docker)

The frontend can be built and deployed as a containerized service. The [Dockerfile](file:///Users/bugaro/projects/apo/frontend/Dockerfile) builds the Vite bundle in a multi-stage process and configures Nginx to serve static files on port `80`.

To start containerized, use the central orchestrator in `backend/infrastructure/`:
```bash
docker compose up -d frontend
```
The app will then be accessible on `http://localhost:80`.
