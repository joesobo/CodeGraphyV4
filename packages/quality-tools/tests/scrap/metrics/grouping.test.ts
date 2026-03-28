import { describe, expect, it } from 'vitest';
import { featureGroupSizes, shapeDiversity } from '../../../src/scrap/metrics/average/groups';

describe('featureGroupSizes', () => {
  it('clusters near-match feature sets with fuzzy similarity', () => {
    const groupSizes = featureGroupSizes([
      ['a', 'b', 'c', 'd'],
      ['a', 'b', 'c', 'x'],
      ['q', 'r']
    ]);

    expect(groupSizes).toEqual([2, 2, 1]);
  });

  it('keeps empty feature lists at zero even when neighbors cluster', () => {
    expect(featureGroupSizes([
      [],
      ['a', 'b', 'c', 'd'],
      ['a', 'b', 'c', 'x'],
      []
    ])).toEqual([0, 2, 2, 0]);
  });

  it('keeps dissimilar feature sets apart', () => {
    const groupSizes = featureGroupSizes([
      ['a', 'b'],
      ['x', 'y'],
      ['m', 'n']
    ]);

    expect(groupSizes).toEqual([1, 1, 1]);
  });

  it('clusters transitively connected feature sets into one group', () => {
    const groupSizes = featureGroupSizes([
      ['a', 'b', 'c'],
      ['a', 'b', 'x'],
      ['a', 'x', 'y']
    ]);

    expect(groupSizes).toEqual([3, 3, 3]);
  });
});

describe('shapeDiversity', () => {
  it('returns zero when there are no feature lists', () => {
    expect(shapeDiversity([])).toBe(0);
  });

  it('reports diversity as connected similarity groups', () => {
    expect(shapeDiversity([
      ['a', 'b', 'c'],
      ['a', 'b', 'd'],
      ['x', 'y', 'z']
    ])).toBe(2);
  });
});
