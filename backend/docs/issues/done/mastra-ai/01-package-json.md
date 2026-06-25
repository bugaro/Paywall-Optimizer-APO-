---
depends_on: []
---

# Issue: Initialize Node.js TypeScript Project and Dependencies

## Context
Before writing any code or architecture adapters for the `mastra-ai` service, we must initialize a standard Node.js TypeScript project workspace with the required dependencies, including Hono for server functionality, Drizzle ORM for PostgreSQL connectivity, pg, and Mastra SDK dependencies.

## Technical Requirements
- Create `services/mastra-ai/package.json` with the following configuration:
  - Name: `apo-mastra-ai`
  - Version: `1.0.0`
  - Engine requirements: Node.js >= 24
  - Add script commands:
    - `"dev": "tsx watch src/infrastructure/server.ts"`
    - `"build": "tsc"`
    - `"start": "node dist/infrastructure/server.js"`
    - `"test": "vitest run"`
- Install core dependencies:
  - `@mastra/core`
  - `hono`
  - `drizzle-orm`
  - `pg`
  - `zod`
  - `dotenv`
  - `uuid`
- Install development dependencies:
  - `typescript`
  - `tsx`
  - `@types/node`
  - `@types/pg`
  - `@types/uuid`
  - `drizzle-kit`
  - `vitest`

## QA & Validation
- **Unit/Integration**: Check that running `npm run build` generates a `dist/` folder structure without compilation failures.
- **Manual/Automated Step**: Run `npm install` inside `services/mastra-ai` and ensure the lockfile is populated without dependency conflicts.
- **Negative Test**: N/A
- **Boundary Check**: Ensure all dependencies match versions used in `telemetry-analytics` or newer stable releases compatible with Node 24.

## Observability Check
- N/A
