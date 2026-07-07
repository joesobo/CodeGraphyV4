import { describe, expect, it } from 'vitest';
import {
  looseStringArraySchema,
  nonEmptyStringSchema,
  stringValueSchema,
} from '../src/values';

describe('values', () => {
  it('filters loose string arrays while defaulting non-arrays to empty arrays', () => {
    expect(looseStringArraySchema.parse(['src/**', 7, 'tests/**'])).toEqual(['src/**', 'tests/**']);
    expect(looseStringArraySchema.parse('src/**')).toEqual([]);
  });

  it('validates required string values while allowing empty strings', () => {
    expect(stringValueSchema.safeParse('symbol-id').success).toBe(true);
    expect(stringValueSchema.safeParse('').success).toBe(true);
    expect(stringValueSchema.safeParse(7).success).toBe(false);
  });

  it('validates optional non-empty strings', () => {
    expect(nonEmptyStringSchema.safeParse('route').success).toBe(true);
    expect(nonEmptyStringSchema.safeParse('').success).toBe(false);
  });
});
