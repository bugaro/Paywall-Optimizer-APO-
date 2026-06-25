---
depends_on: []
---

# Issue: Define Streaming LLM Reasoning Interfaces in Mastra AI

## Context
To support real-time token and status updates during layout mutation generation, the Mastra AI application layer needs ports defining streaming reasoning behaviors. This decouples the use cases from downstream HTTP clients and Ollama-specific stream structures.

## Technical Requirements
*   Modify or extend [ports.ts](file:///Users/bugaro/projects/apo/backend/services/mastra-ai/src/application/ports.ts).
*   Define or update the port interface `LlmReasoningPort` (or introduce a dedicated streaming port interface) to declare:
    *   `generateMutationStream(appId: string, metrics: TelemetryMetrics, signal?: AbortSignal): Promise<ReadableStream<ReasoningChunk>>`
*   Define the core domain types if not already present:
    *   `ReasoningChunk` containing properties `type` (e.g. `'token' | 'status' | 'mutation_update'`), `content` (string), and `timestamp` (number).

## QA & Validation
*   **Unit/Integration**:
    *   Run TypeScript validation `npx tsc --noEmit` from the `services/mastra-ai` directory to verify compile-time contract safety.
*   **Manual/Automated Step**:
    *   None (Interface definition only).
*   **Negative Test**:
    *   None.
*   **Boundary Check**:
    *   None.

## Observability Check
*   None.
