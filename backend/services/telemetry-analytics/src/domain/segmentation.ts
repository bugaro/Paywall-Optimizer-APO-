import { ValidationError } from './errors.ts';
import type { Variant } from './entities.ts';

// FNV-1a Hashing Constants
export const FNV_OFFSET_BASIS = 2166136261;
export const FNV_PRIME = 16777619;
export const FNV_SHIFT_1 = 12;
export const FNV_SHIFT_2 = 25;
export const FNV_SHIFT_3 = 27;

// Segment Evaluation Constants
export const SEGMENT_MODULUS = 100;

/**
 * Computes the 32-bit FNV-1a hash of a string.
 */
export function fnv1a(str: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  if (str.length > 1) {
    hash ^= hash >>> FNV_SHIFT_1;
    hash ^= hash << FNV_SHIFT_2;
    hash ^= hash >>> FNV_SHIFT_3;
  }
  return hash >>> 0;
}

/**
 * Evaluates whether a user belongs to Variant A (Control) or Variant B (Test) for a given A/B test.
 *
 * Hash formula: fnv1a(userId + testId) % 100
 *
 * If hashValue < sampleSizePercent -> Variant B
 * Otherwise -> Variant A
 */
export function evaluateSegment(
  userId: string,
  testId: string,
  sampleSizePercent: number
): Variant {
  if (sampleSizePercent < 0 || sampleSizePercent > SEGMENT_MODULUS) {
    throw new ValidationError('sampleSizePercent must be between 0 and 100');
  }

  if (sampleSizePercent === 0) {
    return 'A';
  }

  if (sampleSizePercent === SEGMENT_MODULUS) {
    return 'B';
  }

  const hashVal = fnv1a(userId + testId) % SEGMENT_MODULUS;
  return hashVal < sampleSizePercent ? 'B' : 'A';
}
