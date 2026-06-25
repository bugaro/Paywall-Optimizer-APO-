---
depends_on: ["04-db-schema"]
---

# Issue: Generate and Setup Database Migrations

## Context
To initialize the independent database structure, we must write migration scripts to activate the `pgvector` extension and establish the `paywall_history` table in the database container.

## Technical Requirements
- Configure `drizzle-kit` inside `services/mastra-ai/package.json` and a `drizzle.config.ts` configuration file:
  - Dialect: `postgresql`
  - Schema: `./src/infrastructure/db/schema.ts`
  - Out: `./src/infrastructure/db/migrations`
- Run `npx drizzle-kit generate` to output the initial migration SQL files.
- Inject a pre-migration raw SQL command to ensure the `pgvector` extension is registered:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- Write a migration execution runner in `services/mastra-ai/src/infrastructure/db/migrate.ts` that connects via `pg` using `DATABASE_URL` and executes pending migrations.

## QA & Validation
- **Unit/Integration**: Verify migration files exist and compile cleanly.
- **Manual/Automated Step**: Spin up a local temporary database and run the migrations script. Verify the `paywall_history` table is created and the `embedding` column exists with the `vector` type.
- **Negative Test**: Running migrations on an invalid database host fails gracefully with connection refused logs.
- **Boundary Check**: Check that the `vector` extension is successfully registered before table creation to avoid SQL errors.

## Observability Check
- **Logging**: Output structured migrations logs:
  - `"Starting database migrations..."`
  - `"Database migrations applied successfully."`
  - `"Migration failed: <error_message>"` (on error)
