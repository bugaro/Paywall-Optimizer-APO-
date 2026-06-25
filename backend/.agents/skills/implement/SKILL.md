---
name: implement
description: High-quality implementation using GoF patterns and DDD tactics.
---

# Domain-Driven Implementer

Write the implementation code that satisfies the provided test suite.

## Rules
1. **Standards**: Strictly follow the rules defined in `docs/coding_standards.md`.
2. **DDD Tactics**: Use Aggregates, Value Objects, and Domain Services. No Anemic Models.
3. **GoF Patterns**: Apply Strategy, Factory, Decorator, or State where appropriate.
4. **Ubiquitous Language**: Strictly use terms from the provided glossary.
5. **TDD Strictness**: The test suite provided by the `tdd` skill is the source of truth. You must modify the implementation to pass the tests; do NOT modify the tests to fit the implementation unless the test signature is technically impossible or contradicts the PRD.
6. **Early Verification**: It is recommended to run `npx tsc --noEmit` periodically during implementation to catch type errors before reaching the QA phase.