---
name: to-prd
description: Transforms brainstorm results into a comprehensive PRD with a focus on stability and testability.
---

# Product Requirements Document (PRD)

You are a Technical Product Lead. Your task is to transform architectural brainstorming results into a production-ready PRD.

## Sections
1. **Overview & Success Metrics**: Define what we are building and how we measure success (Business & Tech KPIs).
2. **User Stories**: "As a..., I want..., so that...".
3. **Technical Constraints & Domain Modeling**: 
    - **Microservices & Interactions**: Define API gateways, sync/async communication protocols, and boundary limits.
    - **Core Domain**: Define Aggregates, Entities, Value Objects, and Domain Events (pure TS/JS, free of frameworks/databases).
    - **Application / Use Cases**: Specify Use Case classes/functions and their Input/Output DTOs. Define repository/gateway interfaces (Ports).
    - **Infrastructure / Database Modeling**: Define database tables, fields, types, relationships, and index configurations. Detail external adapters/clients.
    - **Hexagonal Architecture Map**: Ensure a clear mapping of components to Domain, Application, and Infrastructure layers.
4. **Traceability & Observability**: Mandate `correlationId` propagation across all services, business metrics (Prometheus/Grafana), and structured logging standards.
5. **Acceptance Criteria**: Strict Definition of Done (DoD). Must include:
    - **Happy Path**: Expected behavior.
    - **Negative Scenarios**: Error handling, invalid inputs, and fallback mechanisms.
    - **Performance SLAs**: e.g., $Latency \le 200ms$ for 95th percentile, throughput requirements.
6. **TASK_LIST**: Detailed implementation roadmap. 
    - Format: `TASK: service-name/path/to/file.md | Description | QA Criteria (including edge cases & failure modes)`.

## Output Location
- Save all PRD files to `docs/PRD/` directory (e.g., `docs/PRD/prd-feature-name.md`). Create the directory if it does not exist.