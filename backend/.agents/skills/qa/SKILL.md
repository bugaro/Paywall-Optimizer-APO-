---
name: qa
description: Quality Assurance focused on Interface, Scenarios, and Validation Explanation.
---

# 🛡️ Quality Assurance & Final Validation

The primary goal of the QA phase is to ensure the implementation not only works but is **robust, idiomatic, and satisfies the user's intent** through its external interfaces.

## 🎯 Core Objectives
1. **Interface Focus**: Prioritize the validation of APIs (REST), Event Schemas, and Public Contracts.
2. **Scenario Validation**: Verify the code against the actual usage scenarios (how the user or system interacts with the feature).
3. **Transparent Methodology**: Always explain *what* was checked, *how* it was tested, and *why* it satisfies the requirements.

---

## 🛠️ Execution Workflow

### 1. Interface & API Audit
Analyze the public-facing components of the change:
- **API Signatures**: Ensure REST endpoints follow the `docs/coding_standards.md`.
- **Payload Integrity**: Verify that request/response bodies and event payloads are strictly typed and versioned (e.g., `.v1`).
- **Error Handling**: Verify that the interface returns domain-specific errors (e.g., `NotFoundError`) rather than generic system errors.

### 2. Scenario Mapping & Negative Testing
Walk through the usage scenarios defined in the issue and introduce **Unexpected Scenarios**:
- **Happy Path**: Handle the standard flow as expected.
- **Negative Scenarios**: Proactively test what happens when the user or system does something wrong:
    - Invalid or malformed payloads.
    - Unauthorized or unauthenticated requests.
    - Resource exhaustion (e.g., extremely large strings, negative numbers).
    - Database or third-party service failures (graceful degradation).
- **Edge Cases**: Address empty states, invalid IDs, and race conditions at the interface level.
- **Traceability**: Trace the flow from input (API/Event) to output (Persistence/Publishing).

### 3. Technical Hardening
- **Compiler Validation**: You **MUST** run `npx tsc --noEmit` in the affected service directory. ZERO type errors allowed.
- **Coding Standards**: Cross-reference with `docs/coding_standards.md`. Check for:
  - No `any` types.
  - Strict error formatting (using domain exceptions).
  - Proper dependency injection.
- **Test Coverage**: Verify that tests exist for the interface and cover the mapped scenarios.

### 4. Final Reporting (The "Explain" Step)
Your final response **MUST** include a "Validation Summary" that covers:
- **What was checked**: List the specific files, interfaces, and logic blocks audited, including the **Negative Scenarios** tested.
- **How it was tested**: Detail the commands run (e.g., `npm test`, `tsc`), manual code traces, or failure injection analysis.
- **Satisfied Criteria**: Explicitly map code evidence back to the Issue Acceptance Criteria and explain how the system handles errors gracefully.

---

## 📦 Completion Protocol

At the very end of your final report, you MUST output a JSON block indicating the status. Do not attempt to rename or move files yourself; the orchestrator will handle state transitions based on this JSON.

If the implementation **PASSES**:
```json
{
  "status": "PASSED"
}
```

If the implementation **FAILS**:
```json
{
  "status": "FAILED",
  "reason": "Detailed explanation of what failed (e.g., specific missing requirements, type errors, or standard deviations from docs/coding_standards.md, including actionable feedback for the next implementation attempt)."
}
```