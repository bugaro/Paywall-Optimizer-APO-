---
depends_on: ["FE-01"]
---

# Issue: FE-03: Tailwind CSS and System Dark/Light Theme Integration

## Context
The UI requires "Agentic Modernism" styling with support for system dark/light settings that adjust dynamically based on OS configurations.

## Technical Requirements
* Create `frontend/src/app/index.css` importing Tailwind v4 styles.
* Define variables inside the Tailwind CSS v4 `@theme` configuration:
  * Brand Primary: `#4752c2`, Success: `#10B981`, Error: `#ba1a1a`.
  * Backgrounds and surface tones mapping to design specifications.
* Set up a Theme Observer (media query checking `prefers-color-scheme`) that automatically adds/removes the `dark` class to the document root element.

## QA & Validation
* **Manual Step**: Run application and change macOS theme between Light and Dark. Verify components instantly swap color variants without refreshing.
* **Boundary Check**: Ensure text contrast ratios satisfy WCAG AA standards (minimum 4.5:1 ratio) in both modes.

## Observability Check
* Log statement on window load indicating theme mode initialized (e.g. `[Theme] System preference detected: dark`).
