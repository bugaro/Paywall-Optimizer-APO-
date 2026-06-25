---
depends_on: ["02-tsconfig-json"]
---

# Issue: Define Domain Types and Zod Schema Validations

## Context
Decoupled domain structures and schema definitions are crucial to ensure that the core logic remains independent of the database and external frameworks, enabling easy testing of the RAG formatting logic.

## Technical Requirements
- Create `services/mastra-ai/src/domain/types.ts` containing:
  - `PaywallMutation` interface: `price` (string), `theme` ('light' | 'dark-slate'), `ctaCopy` (string).
  - `TelemetryMetrics` interface: `impressions`, `clicks`, `conversions`, `conversionRate`.
  - `AbHypothesisSchema` Zod validation model:
    ```typescript
    import { z } from 'zod';
    
    export const AbHypothesisSchema = z.object({
      reasoning: z.string(),
      proposedUi: z.object({
        pricePoint: z.number(),
        backgroundColor: z.string(),
        titleText: z.string(),
        ctaText: z.string()
      })
    });
    
    export type AbHypothesis = z.infer<typeof AbHypothesisSchema>;
    ```

## QA & Validation
- **Unit/Integration**: Create a unit test `tests/domain/types.test.ts` that feeds valid and invalid objects into `AbHypothesisSchema.safeParse` and asserts correct results.
- **Manual/Automated Step**: Run `vitest run tests/domain/types.test.ts` to execute schema validations.
- **Negative Test**: Test parsing of missing properties (`reasoning` left out or `pricePoint` provided as string) to assert parsing failure.
- **Boundary Check**: Test with boundary values (e.g., negative `pricePoint`, extremely long string values for text properties).

## Observability Check
- N/A
