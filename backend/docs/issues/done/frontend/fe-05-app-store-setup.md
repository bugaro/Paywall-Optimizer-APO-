---
depends_on: ["FE-01", "FE-04"]
---

# Issue: FE-05: Create App Context State Store

## Context
Manage multi-app properties (App A Calendar and App B Fitness) to provide contextual filters for stats, alerts, and tests.

## Technical Requirements
* Create `frontend/src/entities/application/model/store.ts` using Zustand.
* Define state variables:
  * `activeAppId`: Current filtered application ID (Calendar or Fitness).
  * `applications`: Mock array matching the two demo app configurations.
* Persist the selected `activeAppId` to `localStorage` so it survives browser reloads.

## QA & Validation
* **Unit/Integration**: Verify active app transitions update state correctly.
* **Manual Step**: Change active app from A to B, refresh the browser, and verify B remains selected.

## Observability Check
* Log application selection update event: `[App Context] Switch to: <app_id>`.
