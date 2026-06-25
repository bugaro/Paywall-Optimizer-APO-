---
depends_on: ["FE-03", "FE-06"]
---

# Issue: FE-08: Build Copilot Conversational Sidebar & Generative Cards

## Context
The Copilot sidebar facilitates chat, displays RAG context logs, and renders custom generative cards to deploy split tests.

## Technical Requirements
* Create `frontend/src/widgets/copilot-sidebar/ui/CopilotSidebar.tsx` using CopilotKit.
* Build the glassmorphic sidebar panel containing:
  * Message timeline showing chat history with Gemma.
  * Context Logs terminal window at the bottom displaying Mastra AI step logs.
  * Custom generative component: `<PaywallExperimentCard />`.
* In `<PaywallExperimentCard />`, include side-by-side variant blueprints, a sample percentage slider (1-99%), and a deploy button calling `POST /api/experiments`.

## QA & Validation
* **Integration**: Ask Gemma to audit App B. Verify the Sidebar receives RAG context logs and renders the experiment card correctly.
* **Manual Step**: Use the slider, select 10%, click "Deploy", and verify a POST request is sent to the backend with correct sample size parameter.

## Observability Check
* Log copilot actions: `[Copilot Action] Executing: initiateAbExperiment | sampleSize: <val>%`.
