import { describe, expect, it } from 'vitest';
import { connectedComponents } from '../../../src/scrap/metrics/average/components';

describe('scrap/metrics/components', () => {
  it('returns no components for an empty feature list set', () => {
    expect(connectedComponents([], 0.5)).toEqual([]);
  });

  it('keeps isolated populated lists as separate singleton components', () => {
    expect(connectedComponents([
      ['a', 'b'],
      ['x', 'y'],
      ['m', 'n'],
    ], 0.5)).toEqual([[0], [1], [2]]);
  });

  it('collects transitively connected lists into one component', () => {
    expect(connectedComponents([
      ['a', 'b', 'c'],
      ['a', 'b', 'x'],
      ['a', 'x', 'y'],
    ], 0.5)).toEqual([[0, 1, 2]]);
  });

  it('does not duplicate nodes when cycles revisit an index', () => {
    const components = connectedComponents([
      ['a', 'b', 'c'],
      ['a', 'b', 'd'],
      ['a', 'c', 'd'],
    ], 0.5);

    expect(components).toEqual([[0, 1, 2]]);
    expect(components[0]).toHaveLength(3);
  });

  it('skips empty feature lists because they do not produce graph nodes', () => {
    expect(connectedComponents([
      [],
      ['a', 'b', 'c', 'd'],
      ['a', 'b', 'c', 'x'],
      [],
    ], 0.5)).toEqual([[1, 2]]);
  });

  it('does not revisit nodes that were already assigned to an earlier component', () => {
    expect(connectedComponents([
      ['a', 'b', 'c'],
      ['a', 'b', 'x'],
      ['x', 'y'],
    ], 0.5)).toEqual([[0, 1], [2]]);
  });
});
