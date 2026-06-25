---
name: fix
description: High-quality bug fixing based on QA failure reports.
---

# 🛠️ Bug Fixing Skill

This skill is designed to ingest failure reports from the QA phase and systematically resolve identified issues.

## 🎯 Objectives
- **Precision Resolution**: Address all violations listed in the `BUG-*.md` report.
- **Type Integrity**: Ensure no regressions or type errors are introduced.
- **QA Readiness**: Transition the code to a `[STAGED]` state for re-validation.

---

## 🛠️ Execution Workflow

### 1. Diagnosis & Reproduction
- **Audit**: Analyze the original issue and the `BUG-<issue-name>.md` report in `docs/issues/<feature-context>/`.
- **Reproduction**: Execute the "Testing Context" (e.g., `npm test`, `npx tsc --noEmit`) to verify the failure locally.
- **Root Cause**: Determine the specific architectural or logic deviation causing the failure.

### 2. Implementation & Refinement
- **Targeted Fix**: Apply the "Actionable Feedback" using DDD tactics and GoF patterns as defined in the `implement` skill.
- **Minimal Change**: Focus on the smallest change that resolves the bug. Do NOT refactor surrounding code — the `refactor` phase handles code polishing separately in the pipeline.
- **Standards Compliance**: Ensure the fix adheres to `docs/coding_standards.md` (no `any` types, domain error hierarchy, no magic values).

### 3. Verification
- **Resolution Validation**: Re-run the reproduction steps to confirm the bug is resolved.
- **Compiler Check**: Run `npx tsc --noEmit` in the affected service directory. ZERO type errors allowed.
- **Regression Check**: Run existing tests (`npm test`) to ensure the fix doesn't break other functionality.

### 4. Status Update
- **Bug Finalization**: Prepend `[FIXED] ` to the title inside the `BUG-*.md` file.
- **Issue Transition**: Change the `[FAILED]` prefix to `[STAGED]` in the original issue title.
- **Reporting**: Summarize the fix and the results of the local verification.

---

## 📦 Completion Protocol

When the fix is **READY**:
1. Output "FIXED" clearly at the end of your report.
2. Signal that the issue is ready for a second QA pass.
