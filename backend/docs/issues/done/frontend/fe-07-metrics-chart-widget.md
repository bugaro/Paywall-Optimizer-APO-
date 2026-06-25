---
depends_on: ["FE-03", "FE-06"]
---

# Issue: FE-07: Build Live Metrics Dashboard Charts

## Context
Visualize conversion rate, purchases, and impressions. The chart must automatically fork to track A/B split metrics when a test starts.

## Technical Requirements
* Create `frontend/src/widgets/metrics-chart/ui/MetricsChart.tsx` using Recharts.
* Render a double-line chart:
  * If no experiment is active: render a single metric line (e.g. CR) with a target threshold line (3.0%).
  * If an experiment is active: fork the chart to show Control (90%) and Test (10%) lines separately.
* Add smooth SVG animations to prevent jarring re-draws when new 5-second tumbling metrics arrive.

## QA & Validation
* **Unit/Integration**: Verify the chart handles empty data states gracefully without crashing the UI.
* **Manual Step**: Run simulation, verify that App B dips to 1.8% and flashes red. Verify that launching an A/B test splits the chart lines dynamically.

## Observability Check
* Standard React error boundaries output console logs on SVG render warnings.
