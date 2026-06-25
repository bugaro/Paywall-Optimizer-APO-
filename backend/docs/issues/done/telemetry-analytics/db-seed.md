---
depends_on: [db-schema]
---

# Issue: Database Seeding Logic

## Context
Seeding the database with realistic tenant (Application) and user population data is essential for running the telemetry simulation and for local development testing. On system boot, if the database is uninitialized (i.e. contains no applications), the service must transactionally seed Applications, Users, and Cohort Overlaps to match the ecosystem configuration specified in the PRD.

## Technical Requirements
- Create/modify the seed script at [seed.ts](file:///Users/bugaro/projects/apo/backend/services/telemetry-analytics/src/infrastructure/db/seed.ts).
- Wrap the entire seeding process in a single SQL transaction.
- Check if the `applications` table is empty. If it has data, skip seeding to avoid duplicates.
- If empty, perform the following inserts:
  1. **Applications (2 apps)**:
     - **App A**: Name: `"Premium Productivity Calendar"`.
     - **App B**: Name: `"High-Performance Fitness Tracker"`.
  2. **Users & Relationships (2,000 users total)**:
     - Generate exactly 2,000 user accounts with realistic emails (e.g. `user_1@example.com` to `user_2000@example.com`).
     - Insert these users into the `users` table in chunks (e.g., 500 at a time) to prevent SQL parameter limit errors.
     - Build and insert `users_to_apps` records with the following exact distribution:
       - **900 users** are active exclusively in **App A**: Insert 900 junction rows for `(user_id, App_A_ID)` with `app_a_subscribed` and `app_b_subscribed` set to `false`.
       - **900 users** are active exclusively in **App B**: Insert 900 junction rows for `(user_id, App_B_ID)` with `app_a_subscribed` and `app_b_subscribed` set to `false`.
       - **200 overlap users** are active in **both App A and App B**: Insert two junction rows for each of these 200 users: `(user_id, App_A_ID)` and `(user_id, App_B_ID)` with `app_a_subscribed` and `app_b_subscribed` set to `false`.
  3. **A/B Isolation Test (1 test)**:
     - Create an initial active A/B test in the `ab_tests` table for App B to enable immediate simulation:
       - Name: `"App B UI Slates Minimalist"`
       - `sample_size_percent`: `10`
       - `is_active`: `true`
       - `status`: `'running'`
- Provide a trigger or export function `seedDatabaseIfEmpty(db)` that can be invoked at application startup.

## QA & Validation
- **Unit/Integration**:
  - Verify seed execution on an empty test database schema.
  - Assert that after seeding:
    - `applications` table has exactly 2 records.
    - `users` table has exactly 2,000 records.
    - `users_to_apps` table has exactly 2,200 records ($900 + 900 + 200 \times 2$).
    - Overlap users are correctly identified (exactly 200 users have count of apps = 2).
- **Manual/Automated Step**:
  - Run the seed script via CLI or server boot and check database records.
  - Verify subsequent boots of the service do not run seeding or duplicate entries.
- **Negative Test**:
  - Force a database failure (e.g., disconnect or trigger constraint error) midway during the users insertion. Verify that the transaction rolls back completely, leaving the database empty (atomicity check).

## Observability Check
- **Logging**:
  - Log start of seeding: `"Database seeding initiated..."`
  - Log successful completion: `"Database seeded successfully: 2 applications, 2,000 users, and 2,200 app mappings created."`
  - Log skipped seeding: `"Database already contains application data. Seeding skipped."`
  - Log error if transaction fails.
- **Metrics**:
  - None required for this seed startup script.
