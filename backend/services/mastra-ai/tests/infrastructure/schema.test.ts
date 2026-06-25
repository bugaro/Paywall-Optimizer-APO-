import { describe, it, expect } from 'vitest';
import { paywallHistory } from '../../src/infrastructure/db/schema.ts';

describe('Database Schema Specifications', () => {
  it('should define the paywall_history table with correct structure', () => {
    // Given & When & Then
    expect(paywallHistory).toBeDefined();
    expect(paywallHistory.id).toBeDefined();
    expect(paywallHistory.appId).toBeDefined();
    expect(paywallHistory.pricePoint).toBeDefined();
    expect(paywallHistory.backgroundColor).toBeDefined();
    expect(paywallHistory.titleText).toBeDefined();
    expect(paywallHistory.ctaText).toBeDefined();
    expect(paywallHistory.conversionRate).toBeDefined();
    expect(paywallHistory.failureCondition).toBeDefined();
    expect(paywallHistory.embedding).toBeDefined();
    expect(paywallHistory.createdAt).toBeDefined();
  });
});
