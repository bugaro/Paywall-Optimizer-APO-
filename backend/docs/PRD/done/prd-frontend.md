# Product Requirements Document (PRD) — APO Frontend (`prd-frontend`)

## 1. Overview & Success Metrics

The APO Frontend is a single-page application (SPA) built with Vite + React + TypeScript that serves as the interactive control room for the Multi-Asset Autonomous Paywall Optimizer. It provides real-time analytics dashboards, an AI-powered Copilot sidebar (via CopilotKit), and Human-in-the-Loop (HITL) A/B experiment controls.

### Success Metrics

- **Business KPIs**:
  - **Time-to-Experiment**: A growth manager can go from breach alert to deployed A/B test in under 30 seconds.
  - **Dashboard Fidelity**: Real-time metrics render within 500ms of the backend tumbling window closing.
- **Technical KPIs**:
  - **Time-to-Interactive (TTI)**: First meaningful paint ≤ 2s on a 4G connection.
  - **Poll Accuracy**: No stale or out-of-order metric data displayed (zero visual glitches from race conditions).
  - **CopilotKit Responsiveness**: Chat input to first token ≤ 500ms perceived latency.

---

## 2. User Stories

- **Dashboard Monitoring**: As a growth manager, I want to see real-time conversion rate, impressions, clicks, and purchases for each of my mobile apps so that I can identify underperforming paywalls at a glance.
- **Multi-App Context Switching**: As a growth manager managing multiple app properties, I want to switch between apps and see their isolated metrics and active experiments without page reload.
- **AI Remediation**: As a growth manager, when I see a CR breach, I want to ask the AI Copilot to audit the app and propose a paywall mutation, with the reasoning streamed in real-time.
- **Controlled A/B Deployment**: As a growth manager, I want to preview the AI's proposed mutation, adjust the traffic sample size via a slider, and deploy the experiment, then watch the live forked chart.
- **Experiment Lifecycle Visibility**: As a growth manager, I want to see all active/running experiments per app, their status, and their performance delta vs. control.
- **Offline Gracefulness**: As a growth manager with unstable connectivity, I want the dashboard to display cached last-known metrics and clearly indicate stale/offline state.

---

## 3. Technical Constraints & Domain Modeling

### Microservices & Interactions

```
apo-frontend (:5173 dev / :80 prod)
  │
  ├── REST (JSON) ──────────► apo-telemetry-analytics (:4003)
  │     GET  /api/metrics?appId={id}&since={iso}
  │     POST /api/experiments
  │
  └── CopilotKit Runtime ───► copilot-bridge (:4005)
        POST /copilot/chat
```

| Constraint | Rule |
|------------|------|
| Direct service calls | No API Gateway. Frontend resolves service hostnames via Docker DNS (prod) or `localhost` + Vite proxy (dev). |
| CORS | Backend Hono servers must whitelist `http://localhost:5173` (dev) and `http://apo-frontend` (Docker). |
| No BFF | Frontend is directly coupled to backend API shapes. Contract tests are mandatory. |
| No auth | Initial build has no auth layer. API keys or session gates are future scope. |

### Core Domain (Entities & Value Objects)

All domain types live under `src/entities/` following Feature-Sliced Design.

#### Entity: `Application`
```typescript
interface Application {
  id: string;       // UUID
  name: string;     // e.g. "Premium Productivity Calendar"
  description: string;
}
```

#### Entity: `Experiment`
```typescript
interface Experiment {
  id: string;
  appId: string;
  name: string;
  sampleSizePercent: number;   // 1-100
  status: "running" | "completed" | "failed";
  isActive: boolean;
  createdAt: string;   // ISO-8601
  updatedAt: string;
}
```

#### Value Object: `MetricWindow`
```typescript
interface MetricWindow {
  timestamp: string;          // ISO-8601
  variant: "A" | "B";
  impressions: number;
  clicks: number;
  purchases: number;
  conversionRate: number;     // purchases / impressions
}
```

#### Value Object: `RemediationProposal`
```typescript
interface RemediationProposal {
  reasoning: string;
  proposedUi: {
    pricePoint: number;
    backgroundColor: "light" | "dark-slate";
    titleText: string;
    ctaText: string;
  };
  price: string;       // "$7.99"
  theme: "light" | "dark-slate";
  ctaCopy: string;
}
```

#### Value Object: `AbExperimentPayload`
```typescript
interface AbExperimentPayload {
  appId: string;
  sampleSizePercent: number;
  mutation: {
    price: string;
    theme: "light" | "dark-slate";
    ctaCopy: string;
  };
}
```

### Application / State Management (Zustand Stores)

#### `useMetricsStore`
```typescript
interface MetricsState {
  windows: Record<string, MetricWindow[]>;   // keyed by appId
  isLoading: boolean;
  error: string | null;
  pollingIntervalId: number | null;
  fetchMetrics: (appId: string, since?: string) => Promise<void>;
  startPolling: (appId: string, intervalMs?: number) => void;
  stopPolling: () => void;
}
```

#### `useExperimentStore`
```typescript
interface ExperimentState {
  experiments: Experiment[];
  activeExperiment: Experiment | null;
  isLoading: boolean;
  error: string | null;
  fetchExperiments: (appId: string) => Promise<void>;
  createExperiment: (payload: AbExperimentPayload) => Promise<Experiment>;
}
```

#### `useAppStore`
```typescript
interface AppState {
  apps: Application[];
  activeAppId: string | null;
  setActiveApp: (appId: string) => void;
}
```

### Hexagonal Architecture Map (FSD Layers)

```
src/
├── app/                         # APPLICATION LAYER BOOTSTRAP
│   ├── providers/               #   CopilotKit provider, store hydration
│   ├── index.css                #   Theme tokens
│   └── main.tsx                 #   Entry point
│
├── pages/                       # COMPOSITION ROOT
│   └── dashboard/
│       └── DashboardPage.tsx    #   Orchestrates widgets
│
├── widgets/                     # COMPOSED UI BLOCKS
│   ├── metrics-chart/
│   │   ├── ui/MetricsChart.tsx  #   Real-time multi-variant chart
│   │   └── index.ts
│   ├── app-selector/
│   │   ├── ui/AppSelector.tsx   #   App switcher dropdown
│   │   └── index.ts
│   └── copilot-sidebar/
│       ├── ui/CopilotSidebar.tsx
│       └── index.ts
│
├── features/                    # USER ACTIONS / USE CASES
│   ├── initiate-ab-test/
│   │   ├── ui/ExperimentForkSlider.tsx
│   │   ├── api/initiateTest.ts  #   POST /api/experiments adapter
│   │   └── index.ts
│   └── remediate-breach/
│       ├── ui/RemediationCard.tsx
│       ├── api/remediateBreach.ts  # Copilot agent tool call
│       └── index.ts
│
├── entities/                    # DOMAIN MODEL
│   ├── application/
│   │   ├── model/types.ts
│   │   └── index.ts
│   ├── experiment/
│   │   ├── model/types.ts
│   │   └── index.ts
│   └── metrics/
│       ├── model/types.ts
│       └── index.ts
│
└── shared/                      # INFRASTRUCTURE / UI KIT
    ├── api/
    │   ├── client.ts            #   Base fetch wrapper with correlation-id
    │   └── errors.ts            #   Typed error classes
    └── ui/
        ├── Button.tsx
        ├── Slider.tsx
        ├── Card.tsx
        ├── Spinner.tsx
        └── index.ts
```

### Infrastructure Layer

#### Docker
```yaml
services:
  apo-frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: apo-frontend
    ports:
      - "${FRONTEND_PORT:-5173}:80"
    environment:
      VITE_TELEMETRY_URL: "http://apo-telemetry-analytics:4003"
      VITE_COPILOT_URL: "http://copilot-bridge:4005"
      VITE_DEFAULT_APP_ID: "${DEFAULT_APP_ID:-a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d}"
    depends_on:
      - apo-telemetry-analytics
      - copilot-bridge
```

#### Vite Dev Proxy (`vite.config.ts`)
```typescript
server: {
  proxy: {
    "/api": "http://localhost:4003",
    "/copilot": "http://localhost:4005",
  }
}
```

---

## 4. Traceability & Observability

- **Correlation ID Propagation**: The base API client in `shared/api/client.ts` generates or forwards an `X-Correlation-ID` header on every outgoing request. The ID is accessible from Zustand stores for debugging.
- **Structured Logging**: Use `console.warn`/`console.error` with structured JSON envelopes for API errors and state transitions:
  ```typescript
  console.warn({ event: "metrics.poll.stale", appId, received: ts, latest: latestTs });
  ```
- **Error Tracking Boundaries**: Each widget and feature is wrapped in a React Error Boundary that logs the component stack and error to console and renders a fallback UI.
- **Performance Markers**: Use `performance.mark()` and `performance.measure()` around critical paths:
  - `metrics:fetch:start` → `metrics:fetch:end`
  - `experiment:create:start` → `experiment:create:end`
- **Network Resilience**: The API client implements:
  - Request timeout (5s default)
  - Response JSON parsing validation (schema guard on critical endpoints)
  - Retry with exponential backoff (max 2 retries) only on 5xx errors

---

## 5. Acceptance Criteria

### Happy Path
1. User opens the dashboard → sees two apps listed.
2. Selects App B → real-time metrics chart renders with 5s-tumbling windows for Variant A and B.
3. Conversion rate dips below 3% → alert indicator appears.
4. User opens Copilot sidebar, types "optimize App B" → streaming reasoning appears.
5. AI proposes a mutation card with price/theme/CTA preview.
6. User adjusts slider to 10%, clicks "Deploy" → chart forks into Control vs. Test lines.
7. Experiment appears in active experiments list with status "running".

### Negative Scenarios
| Scenario | Expected Behavior |
|----------|------------------|
| Backend 503 on metrics poll | Dashboard shows last known values + "Stale data" warning banner. |
| Backend returns `[]` metrics | Chart shows empty state with "No data for this period" message. |
| CopilotBridge timeout (5s+) | Sidebar shows "AI service unavailable. Try again." with retry button. |
| Invalid slider value (0 or 100) | Clamped to [1, 99] and user sees validation toast. |
| Duplicate experiment click | Button disables after first click. Server returns 409 Conflict → toast "Experiment already exists". |
| Malformed API response (wrong types) | Schema guard catches mismatch. Component renders fallback, error logged. |
| App switch mid-poll | Old polling interval cleared, new fetch starts. No cross-app data bleed. |
| localStorage unavailable | Graceful degradation — Zustand stores work in memory only. |

### Performance SLAs
| Metric | Target |
|--------|--------|
| Metrics poll response render | ≤ 200ms from response receipt to chart update (95th pct) |
| Page load (TTI) | ≤ 2s on fast 3G, ≤ 1s on WiFi |
| CopilotKit first token | ≤ 500ms perceived |
| Bundle size (gzip) | ≤ 150kB initial JS |

---

## 6. Task List

- `TASK: frontend/package.json | Initialize Vite + React + TypeScript project | npm create vite, install dependencies (react, react-dom, zustand, @copilotkit/react-core, @copilotkit/react-ui), configure tsconfig strict.`
- `TASK: frontend/vite.config.ts | Configure Vite dev server with API proxy | Proxy /api → localhost:4003 and /copilot → localhost:4005 for CORS-free development.`
- `TASK: frontend/Dockerfile | Create multi-stage Docker build | Stage 1: node:24-alpine build with Vite. Stage 2: nginx:alpine serve dist/.`
- `TASK: frontend/docker-compose.yml | Define frontend service | Service name apo-frontend, port mapping, env vars for backend URLs, depends_on.`
- `TASK: frontend/src/shared/api/client.ts | Base fetch wrapper | Typed request function with X-Correlation-ID generation, timeout, error handling, and response schema validation guard.`
- `TASK: frontend/src/shared/ui/index.ts | Design system primitives | Button, Slider, Card, Spinner components with compound pattern and a11y attributes.`
- `TASK: frontend/src/entities/metrics/model/types.ts | MetricWindow type and store | Define MetricWindow interface and useMetricsStore with polling logic.`
- `TASK: frontend/src/entities/experiment/model/types.ts | Experiment type and store | Define Experiment interface and useExperimentStore with createExperiment action.`
- `TASK: frontend/src/entities/application/model/types.ts | Application type and store | Define Application type and useAppStore with activeAppId selection.`
- `TASK: frontend/src/features/initiate-ab-test/ui/ExperimentForkSlider.tsx | A/B test creation widget | Slider (1-99%) + Deploy button, connected to useExperimentStore.createExperiment, loading/error states.`
- `TASK: frontend/src/widgets/metrics-chart/ui/MetricsChart.tsx | Real-time metrics chart | Polls GET /api/metrics, renders multi-variant time-series, handles empty/stale states.`
- `TASK: frontend/src/widgets/app-selector/ui/AppSelector.tsx | App switcher | Dropdown list of applications, dispatches useAppStore.setActiveApp, triggers metrics repoll.`
- `TASK: frontend/src/widgets/copilot-sidebar/ui/CopilotSidebar.tsx | CopilotKit sidebar wrapper | Integrates @copilotkit/react-ui sidebar, configures agent endpoint to copilot-bridge.`
- `TASK: frontend/src/pages/dashboard/ui/DashboardPage.tsx | Main dashboard page | Composes AppSelector + MetricsChart + ExperimentForkSlider + CopilotSidebar, reads from useAppStore.`
- `TASK: frontend/src/app/main.tsx | Application entry point | Mounts React root, wraps providers (CopilotKit, stores), renders DashboardPage.`
- `TASK: frontend/src/app/index.css | Global theme tokens | CSS custom properties for color palette, typography, spacing, dark/light variants.`
- `TASK: frontend/tsconfig.json | TypeScript strict config | strict: true, noUnusedLocals, noUnusedParameters, path aliases (@/ → src/).`
- `TASK: frontend/.env | Environment variables | VITE_TELEMETRY_URL, VITE_COPILOT_URL, VITE_DEFAULT_APP_ID.`
