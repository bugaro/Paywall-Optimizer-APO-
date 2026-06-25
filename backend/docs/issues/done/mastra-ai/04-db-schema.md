---
depends_on: ["03-domain-types"]
---

# Issue: Define Independent Database Schema using Drizzle ORM

## Context
The Mastra AI service requires its own isolated database instance to persist historical paywall mutations and their semantic vectors. This allows us to perform semantic vector retrieval without relying on the primary telemetry analytics DB.

## Technical Requirements
- Create `services/mastra-ai/src/infrastructure/db/schema.ts` defining:
  - `paywallHistory` table matching the database model:
    - `id` (UUID, primary key, defaultRandom())
    - `appId` (UUID, not null)
    - `pricePoint` (numeric/decimal, not null)
    - `backgroundColor` (varchar(50), not null)
    - `titleText` (varchar(255), not null)
    - `ctaText` (varchar(255), not null)
    - `conversionRate` (double precision, not null)
    - `failureCondition` (varchar(255), not null)
    - `embedding` (vector(384)) - Using a custom SQL definition or `drizzle-orm/pg-core` vector extension if available:
      ```typescript
      import { pgTable, uuid, varchar, doublePrecision, timestamp, numeric, customType } from 'drizzle-orm/pg-core';
      
      // pgvector support in Drizzle custom type if not natively imported
      const pgVector = customType<{ data: number[] }>({
        dataType() {
          return 'vector(384)';
        },
        toDriver(value: number[]): string {
          return JSON.stringify(value);
        },
        fromDriver(value: unknown): number[] {
          if (typeof value === 'string') {
            return value.slice(1, -1).split(',').map(Number);
          }
          return value as number[];
        }
      });
      ```
  - Define custom indexes, specifically a vector cosine distance index.

## QA & Validation
- **Unit/Integration**: Check schema compilation via TypeScript without errors.
- **Manual/Automated Step**: Import schema definitions into a script and verify database schema output.
- **Negative Test**: N/A
- **Boundary Check**: Verify dimension size of the vector matches exactly `384` (the dimension produced by Ollama's `all-minilm` model).

## Observability Check
- **Logging**: Log schema configuration load status: `"Mastra DB Schema definitions initialized successfully"`.
