import { describe, expect, it } from 'vitest';
import { pairwiseSimilarity } from '../../../src/scrap/metrics/average/groups';

describe('pairwiseSimilarity', () => {
  it('returns zero when there are not enough feature sets to compare', () => {
    expect(pairwiseSimilarity([])).toBe(0);
    expect(pairwiseSimilarity([['a']])).toBe(0);
  });

  it('averages pairwise overlap across all feature sets', () => {
    expect(pairwiseSimilarity([
      ['a', 'b', 'c'],
      ['a', 'b', 'd'],
      ['a', 'x', 'y']
    ])).toBeCloseTo(0.3, 5);
  });
});
