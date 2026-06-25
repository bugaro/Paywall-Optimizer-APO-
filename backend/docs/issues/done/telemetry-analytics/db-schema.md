---
depends_on: []
---

# Issue: Define Drizzle Database Schema

## Context
This task defines the database schema layer of the Telemetry & Analytics Service (`telemetry-analytics`). It maps domain concepts like Applications, Users, Cohort Overlaps, A/B Tests, and Telemetry Events to relational tables in `apo-postgres` via Drizzle ORM. Correct schema definition, composite keys, and indexes are required to ensure high-performance telemetry ingestion and metric querying.

## Technical Requirements
- Create/modify the schema file at [schema.ts](file:///Users/bugaro/projects/apo/backend/services/telemetry-analytics/src/infrastructure/db/schema.ts).
- Define the following 5 PostgreSQL tables:
  1. **`applications`**:
     - `id`: `uuid` (Primary Key, default to random UUID generation).
     - `name`: `varchar(255)` (Unique, Not Null).
     - `created_at`: `timestamp` (Default to current timestamp, Not Null).
  2. **`users`**:
     - `id`: `uuid` (Primary Key, default to random UUID generation).
     - `email`: `varchar(255)` (Unique, Not Null).
     - `created_at`: `timestamp` (Default to current timestamp, Not Null).
  3. **`users_to_apps`**:
     - `user_id`: `uuid` (References `users.id` with cascade deletion).
     - `app_id`: `uuid` (References `applications.id` with cascade deletion).
     - `app_a_subscribed`: `boolean` (Default: `false`, Not Null).
     - `app_b_subscribed`: `boolean` (Default: `false`, Not Null).
     - **Primary Key**: Composite `(user_id, app_id)`.
     - **Index**: B-Tree index on `user_id` to quickly resolve user subscription overlap status.
  4. **`ab_tests`**:
     - `id`: `uuid` (Primary Key, default to random UUID generation).
     - `app_id`: `uuid` (References `applications.id`).
     - `name`: `varchar(255)` (Not Null).
     - `sample_size_percent`: `integer` (Not Null, range 0 to 100).
     - `is_active`: `boolean` (Default: `false`, Not Null).
     - `status`: `varchar(50)` (Must be one of `'draft'`, `'running'`, or `'completed'`, Not Null).
     - `created_at`: `timestamp` (Default to current timestamp, Not Null).
  5. **`telemetry_events`**:
     - `id`: `serial` (Primary Key).
     - `user_id`: `uuid` (References `users.id`).
     - `app_id`: `uuid` (References `applications.id`).
     - `event_type`: `varchar(50)` (Must be one of `'impression'`, `'click'`, or `'purchase'`, Not Null).
     - `variant`: `varchar(10)` (Must be one of `'A'` or `'B'`, Not Null).
     - `created_at`: `timestamp` (Default to current timestamp, Not Null).
     - **Index**: B-Tree index on composite `(app_id, created_at)` to optimize range aggregation queries for the dashboard.
- Export relations utilizing Drizzle's `relations` helper to define relationships between:
  - `applications` and `ab_tests`, `telemetry_events`, `users_to_apps`.
  - `users` and `users_to_apps`, `telemetry_events`.

## QA & Validation
- **Unit/Integration**:
  - Run Drizzle migration compile checks to verify that TS files compile and schemas have valid TypeScript declarations.
  - Verify that the schema compiles without TypeScript errors.
- **Manual/Automated Step**:
  - Execute Drizzle Kit generate command (e.g., `npx drizzle-kit generate`) and inspect the generated SQL migration file.
  - Verify that the SQL contains `CREATE TABLE`, foreign key constraints, composite primary key for `users_to_apps`, and the composite B-Tree index on `telemetry_events(app_id, created_at)`.
- **Negative Test**:
  - Attempt to insert a `users_to_apps` relationship referencing a non-existent `user_id` or `app_id`. Verify the database rejects this with a foreign key violation constraint.
- **Boundary Check**:
  - Ensure schema or migration layer rejects `sample_size_percent` values outside `0` to `100` if check constraints are supported, or document that use-case validation handles this boundary.

## Observability Check
- **Logging**:
  - Log database pool initialization success: `"Database schema loaded, establishing pool connection"`.
- **Metrics**:
  - Track Drizzle database connection status or active connection pool metrics.
