import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { buildUndirectedAdjacencyList, walkDepthFromNode } from '../../../../src/core/views/depth/graph';

const sampleData: IGraphData = {
  nodes: [
    { id: 'a', label: 'a', color: '#fff' },
    { id: 'b', label: 'b', color: '#fff' },
    { id: 'c', label: 'c', color: '#fff' },
  ],
  edges: [
    { id: 'a-b', from: 'a', to: 'b', kind: 'import', sources: [] },
    { id: 'b-c', from: 'b', to: 'c', kind: 'import', sources: [] },
  ],
};

describe('core/views/depth/graph', () => {
  it('builds an undirected adjacency list from graph edges', () => {
    const adjacency = buildUndirectedAdjacencyList(sampleData);

    expect([...adjacency.get('a') ?? []]).toEqual(['b']);
    expect([...adjacency.get('b') ?? []]).toEqual(['a', 'c']);
    expect([...adjacency.get('c') ?? []]).toEqual(['b']);
  });

  it('ignores edges whose endpoints are missing from the graph', () => {
    const adjacency = buildUndirectedAdjacencyList({
      ...sampleData,
      edges: [
        ...sampleData.edges,
        { id: 'a-missing', from: 'a', to: 'missing', kind: 'reference', sources: [] },
      ],
    });

    expect([...adjacency.keys()]).toEqual(['a', 'b', 'c']);
    expect([...adjacency.get('a') ?? []]).toEqual(['b']);
  });

  it('walks breadth-first depths from the root node', () => {
    const adjacency = buildUndirectedAdjacencyList(sampleData);

    expect([...walkDepthFromNode('a', 2, adjacency).entries()]).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ]);
  });

  it('returns no depths for a missing root node', () => {
    const adjacency = buildUndirectedAdjacencyList(sampleData);

    expect(walkDepthFromNode('missing', 2, adjacency)).toEqual(new Map());
  });

  it('returns no depths when the root node id is absent', () => {
    const adjacency = buildUndirectedAdjacencyList(sampleData);

    expect(walkDepthFromNode(undefined, 2, adjacency)).toEqual(new Map());
  });
});
