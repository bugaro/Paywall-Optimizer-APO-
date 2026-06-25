---
depends_on: ["05-db-migrations"]
---

# Issue: Write Database Seeder Script for Vector Entries

## Context
For the semantic search engine (RAG) to yield relevant results, the independent database must contain seed data representing historical high/low conversion mutations, complete with pre-calculated vector embeddings matching standard failure conditions.

## Technical Requirements
- Create a script `services/mastra-ai/src/infrastructure/db/seed.ts` that:
  - Generates 5-10 historical paywall mutation records.
  - Inserts price points, colors, title texts, CTA texts, and conversion rates.
  - Embeds mock float arrays of length 384 representing failure condition embeddings (e.g. App B CR drop below 3%).
  - Executes inserts into `paywall_history` via Drizzle.
- Ensure the seeder clears old entries to prevent duplicate primary keys on re-runs.

## QA & Validation
- **Unit/Integration**: Check database contents after seeding to ensure all properties (including embeddings) match the seed schema.
- **Manual/Automated Step**: Run `npx tsx src/infrastructure/db/seed.ts` and inspect pgAdmin or run a query to verify row count equals the number of seeded items.
- **Negative Test**: If the database is empty or connection fails, verify the seeding script throws an error and exits with code 1.
- **Boundary Check**: Validate that all embeddings have exactly 384 floating-point elements.

## Observability Check
- **Logging**: Output:
  - `"Seeding paywall history database..."`
  - `"Seeded <count> paywall history entries."`
