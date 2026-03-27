import { describe, expect, it } from 'vitest';
import { jaccardSimilarity } from '../../src/scrap/similarityGroups';

describe('jaccardSimilarity', () => {
  it('returns zero when one side is empty', () => {
    expect(jaccardSimilarity(undefined, ['a'])).toBe(0);
    expect(jaccardSimilarity(['a'], undefined)).toBe(0);
    expect(jaccardSimilarity([], ['a'])).toBe(0);
    expect(jaccardSimilarity(['a'], [])).toBe(0);
  });

  it('returns zero when both sides are empty', () => {
    expect(jaccardSimilarity(undefined, undefined)).toBe(0);
    expect(jaccardSimilarity([], [])).toBe(0);
  });

  it('computes overlap across populated feature sets', () => {
    expect(jaccardSimilarity(['a', 'b', 'c'], ['b', 'c', 'd'])).toBeCloseTo(0.5, 5);
  });
});
