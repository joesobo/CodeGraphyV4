import { describe, expect, it } from 'vitest';
import { buildSimilarityEdges } from '../../../src/scrap/metrics/average/edges';
import { connectedComponents } from '../../../src/scrap/metrics/average/components';

describe('buildSimilarityEdges', () => {
  it('skips empty feature lists and only connects similar populated lists', () => {
    const edges = buildSimilarityEdges([
      [],
      ['a', 'b', 'c', 'd'],
      ['a', 'b', 'c', 'x']
    ], 0.5);

    expect([...edges.entries()]).toEqual([
      [1, [2]],
      [2, [1]]
    ]);
  });

  it('keeps dissimilar lists isolated', () => {
    const edges = buildSimilarityEdges([
      ['a', 'b'],
      ['x', 'y'],
      ['m', 'n']
    ], 0.5);

    expect([...edges.entries()]).toEqual([
      [0, []],
      [1, []],
      [2, []]
    ]);
  });

  it('connects matching lists at the end of the search window', () => {
    const edges = buildSimilarityEdges([
      ['a'],
      ['x'],
      ['y'],
      ['a']
    ], 1);

    expect([...edges.entries()]).toEqual([
      [0, [3]],
      [1, []],
      [2, []],
      [3, [0]]
    ]);
  });
});

describe('connectedComponents', () => {
  it('collects transitively connected lists into one component', () => {
    expect(connectedComponents([
      ['a', 'b', 'c'],
      ['a', 'b', 'x'],
      ['a', 'x', 'y']
    ], 0.5)).toEqual([[0, 1, 2]]);
  });

  it('keeps isolated lists as their own components', () => {
    expect(connectedComponents([
      ['a', 'b'],
      ['x', 'y'],
      ['m', 'n']
    ], 0.5)).toEqual([[0], [1], [2]]);
  });

  it('does not duplicate nodes when a component contains a cycle', () => {
    expect(connectedComponents([
      ['a', 'b', 'c'],
      ['a', 'b', 'd'],
      ['a', 'c', 'd']
    ], 0.5).map((component) => component.slice().sort((left, right) => left - right))).toEqual([[0, 1, 2]]);
  });
});
