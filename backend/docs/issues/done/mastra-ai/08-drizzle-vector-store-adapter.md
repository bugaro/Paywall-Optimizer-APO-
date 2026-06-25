---
depends_on: ["04-db-schema", "07-vector-store-port"]
---

# Issue: Implement Drizzle Vector Similarity Query Adapter

## Context
We need a concrete adapter that queries the PostgreSQL database via Drizzle and uses cosine distance calculations to retrieve the top $K$ closest historical paywall mutations matching our failure embedding.

## Technical Requirements
- Create `services/mastra-ai/src/infrastructure/adapters/drizzle-vector-store.adapter.ts` implementing `VectorStorePort`:
  - Implement `findSimilarMutations`:
    - Perform a Drizzle query using `cosineDistance` sorting.
    - Raw SQL format helper (or Drizzle native `sql` function):
      ```typescript
      import { sql } from 'drizzle-orm';
      import { cosineDistance } from 'drizzle-orm'; // If supported, else raw sql helper: sql`embedding <=> ${queryEmbedding}::vector`
      ```
    - Apply `limit` constraint.
  - Implement `saveMutation` to write layout results.

## QA & Validation
- **Unit/Integration**: Write integration test `tests/infrastructure/drizzle-vector-store.test.ts` to assert vector retrieval returns the closest records in distance order.
- **Manual/Automated Step**: Run `vitest run tests/infrastructure/drizzle-vector-store.test.ts` against the test DB.
- **Negative Test**: Assert that a query with a zero vector or malformed array handles errors gracefully.
- **Boundary Check**: Ensure that requesting a limit of 0 returns an empty array, and limits exceeding database records return all records.

## Observability Check
- **Logging**: Log query executions:
  - `"Vector search executed: retrieved <count> similar past mutations"`
  - `"Vector search error: <message>"`
- **Metrics**: Track duration in `mastra_ai_vector_search_duration_seconds`.
