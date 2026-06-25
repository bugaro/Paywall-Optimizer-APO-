---
depends_on: ["FE-07", "FE-08"]
---

# Issue: FE-09: Dashboard Composition and App Entry

## Context
We need to assemble all widgets (Metrics Charts, Selector, Copilot Sidebar) on a responsive dashboard grid.

## Technical Requirements
* Create `frontend/src/pages/dashboard/DashboardPage.tsx`.
* Assemble the layout:
  * Fixed left navigation icon-bar (20 items).
  * Main central panel (fluid grid displaying App cards and Recharts).
  * Persistent Copilot sidebar on the right (320px).
* Wrap sub-widgets in custom `ErrorBoundary` classes to ensure isolated crashes do not take down the whole page.

## QA & Validation
* **Manual Step**: Load dashboard on both viewport widths (Desktop and Mobile) and verify correct layout scaling.
* **Negative Test**: Force a render error inside the charts widget and confirm that the Copilot Sidebar remains functional and the layout holds.

## Observability Check
* Log entry: `[Layout] DashboardPage mounted successfully`.
