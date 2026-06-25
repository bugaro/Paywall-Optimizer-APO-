# Product Requirements Document (PRD): Fleet Analytics & Copilot UI Service

## 1. Overview & Success Metrics

### Overview
We are building the user interface for the **Multi-Asset Autonomous Paywall Optimizer (APO)**. The frontend will be a single-page web application (SPA) designed to act as an interactive control panel for growth managers. It maps out application-specific telemetry, flags conversion bottlenecks, suggests layout and pricing optimizations via an autonomous Copilot, and runs real-time A/B isolation split tests.

The interface will feature a dark/light theme that respects the OS-level system setting by default and leverages Tailwind CSS v4 and Shadcn UI v4.

### Success Metrics
* **Business KPIs**:
  * **Remediation Turnaround**: Decrease the time taken to identify a conversion dip and launch an optimization experiment from days to under 1 minute.
  * **App B Conversion Rate**: Successfully recover App B's conversion rate back to its target threshold of $> 3.0\%$ using AI-driven variant testing.
* **Technical KPIs**:
  * **First Contentful Paint (FCP)**: $\le 1.5s$ on desktop connections.
  * **Render & Transition Latency**: Real-time charts must ingest and repaint within $100ms$ of receiving the aggregated 5-second telemetry window.
  * **Theme Detection**: $100\%$ accuracy in detecting and applying system dark/light preferences.

---

## 2. User Stories

* **US-1: Fleet Monitoring**
  * *As a* Growth Manager,
  * *I want* to view a dashboard with a health card for each app property,
  * *So that* I can instantly spot threshold breaches (e.g., App B's CR dropping to 1.8%).
* **US-2: AI Auditing**
  * *As a* Growth Manager,
  * *I want* to ask the integrated Copilot sidebar to audit a failing app,
  * *So that* the AI retrieves historical paywall mutations and returns a structured layout proposal.
* **US-3: Generative UI Previews**
  * *As a* Growth Manager,
  * *I want* to see a side-by-side comparison card showing the Control layout and the proposed AI Variant,
  * *So that* I can evaluate copy, pricing, and visual differences before going live.
* **US-4: Interactive Split Deployment**
  * *As a* Growth Manager,
  * *I want* to adjust an interactive slider to allocate a percentage of cohort traffic (e.g., 10%) to the proposed variant and deploy the experiment,
  * *So that* I can start a controlled A/B test.
* **US-5: Real-Time Verification**
  * *As a* Growth Manager,
  * *I want* to see a live-forked chart comparing the 90% Control group against the 10% Test group in real time,
  * *So that* I can verify if the variant outperforms the control before full rollout.
* **US-6: Automatic Theme Synchronization**
  * *As a* User,
  * *I want* the interface to match my system's light/dark mode preference automatically,
  * *So that* the visual appearance integrates seamlessly with my desktop environment.

---

## 3. Technical Constraints & Domain Modeling

### Microservices & Interactions
* **Service boundary**: The frontend will run in its own Docker container (Vite dev server on port `5173`, Nginx in production on port `80`).
* **REST Calls**:
  * `GET /api/metrics?appId={appId}`: Returns time-series metric aggregations.
  * `POST /api/experiments`: Creates a new A/B isolation experiment.
* **CopilotKit Protocol**:
  * Persistent WebSockets/SSE communication with `copilot-bridge` (port `4005`).

### Core Domain
Since the frontend is built using Feature-Sliced Design (FSD), the domain models are encapsulated in the **Entities** layer as pure TypeScript definitions:

```typescript
// src/entities/application/model/types.ts
export interface Application {
  id: string;
  name: string;
  status: 'stable' | 'critical';
  currentCr: number;
  targetCr: number;
  lastChangeDescription: string;
  assetId: string;
}

// src/entities/experiment/model/types.ts
export interface AbExperiment {
  id: string;
  appId: string;
  name: string;
  sampleSizePercent: number;
  status: 'active' | 'completed';
  controlVariant: string;
  testVariant: string;
}

// src/entities/metrics/model/types.ts
export interface TelemetryMetric {
  timestamp: string; // ISO string representing the tumbling window boundary
  conversionRate: number;
  impressions: number;
  purchases: number;
  variant: 'A' | 'B';
}
```

### Application / Use Cases (Zustand Stores)
* **`useAppStore`**: Manages selected active applications and global app list configuration.
* **`useMetricsStore`**: Coordinates the polling cycle (every 5 seconds) to fetch aggregated telemetry for the selected application.
* **`useExperimentStore`**: Handles launching experiments and tracking active split-tests.

### Hexagonal Architecture Map (FSD Translation)

* **Domain (Core Rules)**: `src/entities/*/model/types.ts`
  * Pure TypeScript schemas and baseline domain types.
* **Application (Use Cases & Flow)**: `src/entities/*/model/store.ts`
  * Zustand stores managing loading, success, and error states; handling event updates.
* **Infrastructure (Adapters & UI)**:
  * `src/shared/api`: Typed Fetch wrapper with timeout and correlation ID injection.
  * `src/shared/ui`: Reusable UI elements (Button, Slider, Card, etc.).
  * `src/widgets/*`: Composed domain blocks (MetricsChart, CopilotSidebar).

---

## 4. Traceability & Observability

* **Correlation Tracking**:
  * The frontend client must generate a UUID `correlationId` upon initialization or track incoming route contexts.
  * Every API request must inject `X-Correlation-ID: <uuid>` in the headers to trace requests from UI -> Copilot Bridge -> Mastra AI -> Postgres.
* **Log Aggregation**:
  * Centralized frontend logger (`src/shared/lib/logger.ts`) supporting JSON logs with correlation IDs.
* **Error Tracking**:
  * Top-level and widget-level `ErrorBoundary` components to catch and report frontend crashes.

---

## 5. Acceptance Criteria

### Happy Path
1. **System Theme Matching**:
   * On load, the system theme is checked. If the OS dark mode is active, the HTML tag receives `class="dark"`. If light mode is active, `class="light"` (or default Tailwind light classes) is used.
2. **Dashboard Overview**:
   * Landing on the dashboard displays two apps: App A (Productivity Calendar) at $\approx 3.5\%$ CR (stable, green) and App B (Fitness Tracker) at $\approx 1.8\%$ CR (critical alert, red).
3. **Copilot Interaction**:
   * Asking Gemma to audit App B triggers logs in the Context Log console.
   * A Generative UI card `<PaywallExperimentCard />` is dynamically inserted into the conversation thread, displaying the variant blueprint and a sample slider.
4. **Experiment Launch**:
   * Adjusting the slider (e.g. to 10%) and clicking "Deploy Controlled A/B Test" dispatches a POST request to `telemetry-analytics`.
   * A live split-chart immediately forks below App B, tracking Control (90%) and Test (10%) lines independently as they update every 5 seconds.

### Negative Scenarios
1. **API Server Offline**:
   * If `telemetry-analytics` or `copilot-bridge` is unreachable, a styled error banner appears, and the app transitions to "Offline/Stale" state, retaining last known cached values.
2. **Experiment Start Failure**:
   * If `POST /api/experiments` fails (e.g., due to duplicate test names or invalid sample sizes), a toast notification displays the error description, and the slider remains adjustable.
3. **Invalid Theme Transition**:
   * Changing OS-level theme settings while the dashboard is open must trigger immediate live adjustment without requiring a page reload.

### Performance SLAs
* **Render Frame Time**: $\le 16ms$ (maintains 60fps telemetry graph transitions).
* **API Timeout**: All outbound requests must fail fast after a $5000ms$ timeout limit.

---

## 6. Implementation Task List

| Task ID | Target File | Description | QA Criteria & Edge Cases |
| :--- | :--- | :--- | :--- |
| **FE-01** | `frontend/package.json` | Set up Vite, React 19, TypeScript, Tailwind CSS v4, Lucide React, and Recharts dependencies. | Installs with zero dependency conflicts on Node 24. |
| **FE-02** | `frontend/vite.config.ts` | Configure Vite dev server with proxy settings forwarding `/api/*` to backend ports. | Dev server runs on port 5173; proxy routes successfully bypass CORS. |
| **FE-03** | `frontend/src/app/index.css` | Define Tailwind imports, custom font faces (Plus Jakarta Sans, JetBrains Mono), and dark mode mappings. | Theme transitions correctly when toggling classes or OS-level CSS preferences. |
| **FE-04** | `frontend/src/shared/api/client.ts` | Implement typed `fetchClient` utility containing default headers, timeout, and `X-Correlation-ID` injector. | Injects UUID correlations into request headers; throws custom `ApiError` on timeout. |
| **FE-05** | `frontend/src/entities/application/model/store.ts` | Define Zustand store tracking active application, loading states, and mock properties. | Changing selection updates application state; updates stored value in `localStorage`. |
| **FE-06** | `frontend/src/entities/metrics/model/store.ts` | Implement Zustand store fetching real-time metrics and handling polling intervals (every 5 seconds). | Polling starts/stops depending on route state; data caches are invalidated correctly. |
| **FE-07** | `frontend/src/widgets/metrics-chart/ui/MetricsChart.tsx` | Build Recharts dashboard component with animations. | Chart transitions smoothly; handles empty, loading, and error states gracefully. |
| **FE-08** | `frontend/src/widgets/copilot-sidebar/ui/CopilotSidebar.tsx`| Build CopilotKit integration container, context log tracker, and message scroll list. | Messages scroll into view; logs display monospaced execution states with typewriter effects. |
| **FE-09** | `frontend/src/app/main.tsx` | Configure page mounting, react strict mode, global error boundaries, and root layout components. | Component layout mounts securely; fallback UI shows if sub-components crash. |
| **FE-10** | `frontend/Dockerfile` | Create a multi-stage Docker build producing a production Nginx container. | Image builds successfully; static assets serve properly on port 80. |
| **FE-11** | `backend/infrastructure/docker-compose.yml` | Update container compose mappings to include frontend routing and services. | Running `docker compose up` brings up all services without address clashes. |
