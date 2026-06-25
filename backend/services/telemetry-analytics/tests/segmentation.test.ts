import { describe, it, expect } from 'vitest';
import { fnv1a, evaluateSegment } from '../src/domain/segmentation';
import { ValidationError } from '../src/domain/errors';

describe('Deterministic Segmentation Specification', () => {
  // ==========================================
  // FNV-1a Hashing
  // ==========================================
  describe('fnv1a()', () => {
    it('should compute the correct 32-bit FNV-1a hash for empty and known strings', () => {
      // Given & When & Then
      // FNV-1a of empty string is the offset basis: 2166136261
      expect(fnv1a('')).toBe(2166136261);

      // FNV-1a of "a"
      // hash = 2166136261 ^ 97 = 2166136356
      // hash = (2166136356 * 16777619) & 0xffffffff = 3826002220
      expect(fnv1a('a')).toBe(3826002220);
    });

    it('should return a non-negative integer representation', () => {
      // Given
      const inputs = ['user-123', 'test-abc', 'foo-bar-baz', '🚀'];

      // When & Then
      for (const input of inputs) {
        const hash = fnv1a(input);
        expect(hash).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(hash)).toBe(true);
      }
    });
  });

  // ==========================================
  // evaluateSegment
  // ==========================================
  describe('evaluateSegment()', () => {
    it('should assign Variant A immediately if sampleSizePercent is 0', () => {
      // Given
      const userId = 'user-id-1';
      const testId = 'test-id-1';

      // When
      const result = evaluateSegment(userId, testId, 0);

      // Then
      expect(result).toBe('A');
    });

    it('should assign Variant B immediately if sampleSizePercent is 100', () => {
      // Given
      const userId = 'user-id-1';
      const testId = 'test-id-1';

      // When
      const result = evaluateSegment(userId, testId, 100);

      // Then
      expect(result).toBe('B');
    });

    it('should always assign the same variant for the same userId and testId (Stickiness)', () => {
      // Given
      const userId = 'user-id-sticky';
      const testId = 'test-id-sticky';
      const sampleSizePercent = 50;

      // When
      const result1 = evaluateSegment(userId, testId, sampleSizePercent);
      const result2 = evaluateSegment(userId, testId, sampleSizePercent);
      const result3 = evaluateSegment(userId, testId, sampleSizePercent);

      // Then
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should throw ValidationError if sampleSizePercent is out of bounds', () => {
      // Given
      const userId = 'user-id-1';
      const testId = 'test-id-1';

      // When & Then
      expect(() => evaluateSegment(userId, testId, -1)).toThrow(ValidationError);
      expect(() => evaluateSegment(userId, testId, 101)).toThrow(ValidationError);
    });

    it('should distribute variants uniformly and independently across user IDs', () => {
      // Given
      const testId = 'test-experiment-1';
      const sampleSizePercent = 10; // 10% should go to Variant B
      const totalUsers = 10000;
      let countB = 0;

      // When
      for (let i = 0; i < totalUsers; i++) {
        // Generating random UUID-like strings
        const userId = `user-${i}-uuid-string-value-${Math.random()}`;
        const variant = evaluateSegment(userId, testId, sampleSizePercent);
        if (variant === 'B') {
          countB++;
        }
      }

      // Then
      const ratioB = countB / totalUsers;
      // Verification: 10% (+- 1.5%) -> between 8.5% and 11.5%
      expect(ratioB).toBeGreaterThanOrEqual(0.085);
      expect(ratioB).toBeLessThanOrEqual(0.115);
    });

    it('should assign uncorrelated variants when testId changes (Independence)', () => {
      // Given
      const totalUsers = 1000;
      const testId1 = 'test-id-1';
      const testId2 = 'test-id-2';
      const sampleSizePercent = 50;
      let matches = 0;

      // When
      for (let i = 0; i < totalUsers; i++) {
        const userId = `user-${i}`;
        const v1 = evaluateSegment(userId, testId1, sampleSizePercent);
        const v2 = evaluateSegment(userId, testId2, sampleSizePercent);
        if (v1 === v2) {
          matches++;
        }
      }

      // Then
      const matchRatio = matches / totalUsers;
      // Since they are independent, the ratio of overlap should be approx 50%
      expect(matchRatio).toBeGreaterThanOrEqual(0.40);
      expect(matchRatio).toBeLessThanOrEqual(0.60);
    });

    it('should verify exact variant assignment at threshold boundaries', () => {
      // Given
      // We find two concatenated inputs whose fnv1a() % 100 equals exactly 10.
      // Let's search deterministically in the test for strings that satisfy this:
      // (hash % 100 === 10)
      let userId = '';
      const testId = '';
      for (let i = 0; i < 1000; i++) {
        const candidate = `user-boundary-${i}`;
        if (fnv1a(candidate) % 100 === 10) {
          userId = candidate;
          break;
        }
      }
      expect(userId).not.toBe('');

      // When & Then
      // Boundary checks:
      // If sampleSizePercent = 10, variant B requires hashValue < 10.
      // Since hashValue is exactly 10, hashValue < 10 is false, so it must return 'A'.
      expect(evaluateSegment(userId, testId, 10)).toBe('A');
      // If sampleSizePercent = 11, variant B requires hashValue < 11.
      // Since hashValue is 10, 10 < 11 is true, so it must return 'B'.
      expect(evaluateSegment(userId, testId, 11)).toBe('B');
    });
  });
});
