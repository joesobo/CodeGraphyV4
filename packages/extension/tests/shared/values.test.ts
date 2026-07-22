import { describe, expect, it } from 'vitest';
import {
  looseStringArraySchema,
  nonEmptyStringSchema,
  trimmedNonEmptyStringSchema,
} from '../../src/shared/values';

describe('shared/values', () => {
  it('filters loose string arrays while defaulting non-arrays to empty arrays', () => {
    expect(looseStringArraySchema.parse(['src/**', 7, 'tests/**'])).toEqual(['src/**', 'tests/**']);
    expect(looseStringArraySchema.parse('src/**')).toEqual([]);
  });

  it('validates non-empty strings without trimming', () => {
    expect(nonEmptyStringSchema.safeParse(' plugin ').success).toBe(true);
    expect(nonEmptyStringSchema.safeParse('').success).toBe(false);
  });

  it('trims strings before requiring non-empty content', () => {
    expect(trimmedNonEmptyStringSchema.parse(' plugin ')).toBe('plugin');
    expect(trimmedNonEmptyStringSchema.safeParse('   ').success).toBe(false);
  });
});
