---
name: to-issues
description: Decomposes PRD into atomized technical issues with a focus on testability and validation.
---

# Issue Decomposer

Break the PRD into independent, atomized technical tasks.

## Rules
0. **Source of Truth**: Generate one independent issue file for every task listed in the `TASK_LIST` section of the PRD.
1. **File Pathing**: Use the format `---FILE: docs/issues/<feature-context>/<issue-name>.md---`.
2. **Structure**: Each issue must include: 
    - **Context**: Why this task exists.
    - **Technical Requirements**: Precise implementation details.
    - **QA & Validation**: Mapping from PRD `QA Criteria` + specific testing steps.
    - **Observability Check**: What logs or metrics should appear after this task is done?
3. **Ubiquitous Language**: Cross-reference `docs/ubiquitous_language.md`.
4. **Dependency Frontmatter**: 
    ```yaml
    ---
    depends_on: [previous-issue-id]
    ---
    ```
5. **Architectural Isolation**:
    - Decompose tasks strictly along Hexagonal / Clean Architecture boundaries.
    - Create separate, decoupled issues for:
      - **Domain Layer**: Pure business logic (Entities, Value Objects, Domain Services). Target folder: `src/domain/`.
      - **Application Layer**: Use Cases (Interactors) and Ports (interfaces). Target folder: `src/application/`.
      - **Database Schema**: DB schema definition (e.g., Drizzle files), relations, seed data, and migration setup. Target folder: `src/infrastructure/db/`.
      - **Infrastructure Adapters**: Database repositories, HTTP routers/controllers, event stream handlers, or external clients. Target folder: `src/infrastructure/`.
    - Ensure infrastructure issues depend on application/domain issues via the `depends_on` frontmatter.

## QA-Driven decomposition
For each issue, you MUST generate a **"How to Verify"** section:
1. **Unit/Integration**: What specific logic needs coverage? (e.g., "Mock DB error and verify retry logic").
2. **Manual/Automated Step**: A step-by-step guide for a human or agent to verify the change.
3. **Negative Test**: What input should cause a controlled 4xx/5xx error?
4. **Boundary Check**: If the task involves data, specify the limits to test.

## Observability Requirement
If the task involves logic or data flow, the issue MUST include a requirement for:
- **Logging**: Specific log message or event name.
- **Metrics**: Which counter or histogram must be updated.