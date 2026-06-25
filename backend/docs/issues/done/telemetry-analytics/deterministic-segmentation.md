---
depends_on: []
---

# Issue: Deterministic A/B Test Segmentation Engine

## Context
To ensure scientific validity of our A/B isolation tests, user variant assignments must be deterministic and sticky across sessions without storing the assignment state for every user. We will implement a pure domain utility utilizing the FNV-1a 32-bit hashing algorithm. Given a user ID and an active test ID, the utility will resolve whether a user falls into the Control group (Variant A) or the Test group (Variant B) based on the test's target sample size percentage.

## Technical Requirements
- Create the domain file at [segmentation.ts](file:///Users/bugaro/projects/apo/backend/services/telemetry-analytics/src/domain/segmentation.ts).
- Implement a 32-bit FNV-1a hash function:
  - FNV offset basis: `2166136261`
  - FNV prime: `16777619`
  - The function should take a string and output a non-negative integer representation of the hash.
- Implement the segmentation evaluation function:
  ```typescript
  export function evaluateSegment(
    userId: string, 
    testId: string, 
    sampleSizePercent: number
  ): 'A' | 'B'
  ```
  - Input: `userId` (string), `testId` (string), `sampleSizePercent` (number, integer between 0 and 100).
  - Calculate hash input string: `userId + testId` (no separator).
  - Compute: `hashValue = fnv1a(userId + testId) % 100`.
  - Assignment:
    - If `hashValue < sampleSizePercent`, assign **Variant B**.
    - Otherwise, assign **Variant A**.
  - Edge cases:
    - If `sampleSizePercent === 0`, return `'A'` immediately without executing hash.
    - If `sampleSizePercent === 100`, return `'B'` immediately without executing hash.
- Ensure the code has zero dependencies on external modules, libraries, database connections, or global state.

## QA & Validation
- **Unit/Integration**:
  - Test `fnv1a` with known string hashes.
  - Test variant distribution: Feed 10,000 random user UUIDs through `evaluateSegment` with `sampleSizePercent = 10` and verify that approximately $10\%$ ($\pm 1.5\%$) of the population is assigned to Variant B.
  - Test stickiness: Verify that calling `evaluateSegment` multiple times with the exact same `userId` and `testId` always returns the same variant.
  - Test independence: Verify that changing the `testId` for a given `userId` yields a different, uncorrelated distribution.
- **Manual/Automated Step**:
  - Write a suite of unit tests using Vitest covering:
    - `sampleSizePercent` of `0%`, `10%`, `50%`, and `100%`.
    - Input parameter boundary validations (e.g. throwing error if `sampleSizePercent` is negative or greater than 100).
- **Negative Test**:
  - Provide validation inside the function. If `sampleSizePercent` is less than 0 or greater than 100, throw an validation error.
- **Boundary Check**:
  - Verify exact hash results at the threshold boundary. For example, if `fnv1a(...) % 100` equals exactly `10`, a `sampleSizePercent` of `10` must assign `'A'` (since $10 \not< 10$), and a `sampleSizePercent` of `11` must assign `'B'`.

## Observability Check
- **Logging**:
  - None inside this pure function to avoid excessive event logs on every evaluation.
- **Metrics**:
  - None.
