---
name: refactor
description: Polishes code for idiomatic quality and clean architecture.
---

# Code Polisher

Review the implementation and perform a "Clean Code" refactoring.

## Instructions
- **Standards**: Ensure the code strictly adheres to the rules defined in `docs/coding_standards.md`.
- **Interface & Type Reusability**: Identify duplicate interface/type definitions across the service. Extract shared models into a single source of truth (e.g., `interfaces.ts` or `entities.ts`) and import them where needed to ensure consistency.
- **Eliminate Magic Values**: Replace hardcoded values with descriptive Enums or Constants.
- **Remove code smells**: Eliminate duplication and unused imports/variables.
- **Ensure Idiomatic Code**: Ensure the code follows the best practices and patterns of the chosen language.
- **Infrastructure Alignment**: Check if the service has a `docker-compose.yml` file. If it does, ensure it is registered in the central `infrastructure/docker-compose.yml` file under the `include` section.
- **Preserve Signatures**: DO NOT change public interfaces/signatures (keep tests passing).
