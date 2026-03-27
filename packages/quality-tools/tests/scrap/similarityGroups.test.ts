import { describe, expect, it } from 'vitest';
import {
  averagePairwiseSimilarity,
  featureGroupSizes,
  jaccardSimilarity,
  shapeDiversity
} from '../../src/scrap/similarityGroups';

describe('jaccardSimilarity', () => {
  it('returns zero when either side is empty', () => {
    expect(jaccardSimilarity(undefined, ['a'])).toBe(0);
    expect(jaccardSimilarity(undefined, undefined)).toBe(0);
  });

  it('computes overlap across populated feature sets', () => {
    expect(jaccardSimilarity(['a', 'b', 'c'], ['b', 'c', 'd'])).toBeCloseTo(0.5, 5);
  });
});

describe('featureGroupSizes', () => {
  it('clusters near-match feature sets with fuzzy similarity', () => {
    const groupSizes = featureGroupSizes([
      ['a', 'b', 'c', 'd'],
      ['a', 'b', 'c', 'x'],
      ['q', 'r']
    ]);

    expect(groupSizes).toEqual([2, 2, 1]);
  });

  it('keeps dissimilar feature sets apart', () => {
    const groupSizes = featureGroupSizes([
      ['a', 'b'],
      ['x', 'y'],
      ['m', 'n']
    ]);

    expect(groupSizes).toEqual([1, 1, 1]);
  });
});

describe('shape diversity helpers', () => {
  it('reports diversity as connected similarity groups', () => {
    expect(shapeDiversity([
      ['a', 'b', 'c'],
      ['a', 'b', 'd'],
      ['x', 'y', 'z']
    ])).toBe(2);
  });

  it('computes average pairwise similarity across feature sets', () => {
    expect(averagePairwiseSimilarity([
      ['a', 'b', 'c'],
      ['a', 'b', 'd']
    ])).toBeCloseTo(0.5, 5);
  });
});
