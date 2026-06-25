import { describe, it, expect } from 'vitest';
import { AbHypothesisSchema } from '../../src/domain/types.ts';

describe('AbHypothesisSchema Validation Specifications', () => {
  it('should successfully parse a valid hypothesis object', () => {
    // Given
    const validPayload = {
      reasoning: 'App B is experiencing low conversion rate. Based on past historical metrics, swapping to a dark slate theme with a price drop from $9.99 to $7.99 recovered conversion rate by 1.8%.',
      proposedUi: {
        pricePoint: 7.99,
        backgroundColor: 'dark-slate',
        titleText: 'Premium Fitness Tracker',
        ctaText: 'Unlock Full Access'
      }
    };

    // When
    const result = AbHypothesisSchema.safeParse(validPayload);

    // Then
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.proposedUi.pricePoint).toBe(7.99);
      expect(result.data.proposedUi.backgroundColor).toBe('dark-slate');
    }
  });

  describe('Negative & Validation Failure Checks', () => {
    it('should reject payload with missing reasoning', () => {
      // Given
      const invalidPayload = {
        proposedUi: {
          pricePoint: 7.99,
          backgroundColor: 'dark-slate',
          titleText: 'Premium Fitness Tracker',
          ctaText: 'Unlock Full Access'
        }
      };

      // When
      const result = AbHypothesisSchema.safeParse(invalidPayload);

      // Then
      expect(result.success).toBe(false);
    });

    it('should reject payload with pricePoint provided as a string', () => {
      // Given
      const invalidPayload = {
        reasoning: 'Valid reasoning string',
        proposedUi: {
          pricePoint: '7.99', // should be number
          backgroundColor: 'dark-slate',
          titleText: 'Premium Fitness Tracker',
          ctaText: 'Unlock Full Access'
        }
      };

      // When
      const result = AbHypothesisSchema.safeParse(invalidPayload);

      // Then
      expect(result.success).toBe(false);
    });

    it('should reject payload with missing nested proposedUi fields', () => {
      // Given
      const invalidPayload = {
        reasoning: 'Valid reasoning string',
        proposedUi: {
          pricePoint: 7.99,
          backgroundColor: 'dark-slate'
          // titleText and ctaText are missing
        }
      };

      // When
      const result = AbHypothesisSchema.safeParse(invalidPayload);

      // Then
      expect(result.success).toBe(false);
    });
  });

  describe('Boundary Check Cases', () => {
    it('should accept boundary numeric value (e.g. 0 or negative pricePoint if configured as general number)', () => {
      // Given
      const boundaryPayload = {
        reasoning: 'Free trial proposal',
        proposedUi: {
          pricePoint: 0,
          backgroundColor: 'light',
          titleText: 'Free Tryout',
          ctaText: 'Start Trial'
        }
      };

      // When
      const result = AbHypothesisSchema.safeParse(boundaryPayload);

      // Then
      expect(result.success).toBe(true);
    });

    it('should handle extremely long string values for text properties', () => {
      // Given
      const longString = 'A'.repeat(5000);
      const boundaryPayload = {
        reasoning: longString,
        proposedUi: {
          pricePoint: 9.99,
          backgroundColor: 'slate',
          titleText: longString,
          ctaText: longString
        }
      };

      // When
      const result = AbHypothesisSchema.safeParse(boundaryPayload);

      // Then
      expect(result.success).toBe(true);
    });
  });
});
