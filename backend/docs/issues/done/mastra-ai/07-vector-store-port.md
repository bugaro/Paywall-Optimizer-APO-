---
depends_on: ["03-domain-types"]
---

# Issue: Define Port Interface for Vector Storage Actions

## Context
Following hexagonal architecture principles, we must decouple database interfaces (ports) from concrete infrastructure adapter implementations. This allows us to unit test the business logic by mocking database queries easily.

## Technical Requirements
- Create `services/mastra-ai/src/application/ports/vector-store.port.ts` containing:
  - `VectorStorePort` interface:
    - `findSimilarMutations(queryEmbedding: number[], limit: number): Promise<PaywallHistoryEntry[]>`
    - `saveMutation(entry: Omit<PaywallHistoryEntry, 'id' | 'createdAt'>): Promise<PaywallHistoryEntry>`
  - Define `PaywallHistoryEntry` type mirroring the database record fields (from the domain schema level).

## QA & Validation
- **Unit/Integration**: Verify compilation of the port file.
- **Manual/Automated Step**: Check that use-cases importing the port compile cleanly.
- **Negative Test**: N/A
- **Boundary Check**: N/A

## Observability Check
- N/A
