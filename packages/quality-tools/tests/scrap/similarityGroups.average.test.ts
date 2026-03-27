import { describe, expect, it } from 'vitest';
import { averagePairwiseSimilarity } from '../../src/scrap/similarityGroups';

describe('averagePairwiseSimilarity', () => {
  it('returns zero when there are not enough feature sets to compare', () => {
    expect(averagePairwiseSimilarity([])).toBe(0);
    expect(averagePairwiseSimilarity([['a']])).toBe(0);
  });

  it('averages pairwise overlap across all feature sets', () => {
    expect(averagePairwiseSimilarity([
      ['a', 'b', 'c'],
      ['a', 'b', 'd'],
      ['a', 'x', 'y']
    ])).toBeCloseTo(0.3, 5);
  });
});
