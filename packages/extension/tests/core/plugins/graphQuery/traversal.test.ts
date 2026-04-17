import { describe, expect, it, vi } from 'vitest';
import { findNodePath as findPath } from '../../../../src/core/plugins/graphQuery/path';
import { buildSubgraph as getSubgraph } from '../../../../src/core/plugins/graphQuery/subgraph';
import type { IGraphData } from '../../../../src/shared/graph/contracts';

const sampleGraph: IGraphData = {
  nodes: [
    { id: 'a.ts', label: 'a.ts', color: '#fff' },
    { id: 'b.ts', label: 'b.ts', color: '#fff' },
    { id: 'c.ts', label: 'c.ts', color: '#fff' },
    { id: 'd.ts', label: 'd.ts', color: '#fff' },
  ],
  edges: [
    { id: 'a->b', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] },
    { id: 'b->c', from: 'b.ts', to: 'c.ts', kind: 'import', sources: [] },
    { id: 'c->d', from: 'c.ts', to: 'd.ts', kind: 'reference', sources: [] },
  ],
};

describe('core/plugins/graphQuery/traversal', () => {
  it('returns an induced subgraph around a seed node', () => {
    const getter = vi.fn().mockReturnValue(sampleGraph);

    expect(getSubgraph('b.ts', 1, getter)).toEqual({
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
        { id: 'c.ts', label: 'c.ts', color: '#fff' },
      ],
      edges: [
        { id: 'a->b', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] },
        { id: 'b->c', from: 'b.ts', to: 'c.ts', kind: 'import', sources: [] },
      ],
    });
  });

  it('returns an empty subgraph for missing nodes or negative hops', () => {
    const getter = vi.fn().mockReturnValue(sampleGraph);

    expect(getSubgraph('missing', 1, getter)).toEqual({ nodes: [], edges: [] });
    expect(getSubgraph('a.ts', -1, getter)).toEqual({ nodes: [], edges: [] });
  });

  it('returns only the seed node when hops is zero', () => {
    const getter = vi.fn().mockReturnValue(sampleGraph);

    expect(getSubgraph('b.ts', 0, getter)).toEqual({
      nodes: [{ id: 'b.ts', label: 'b.ts', color: '#fff' }],
      edges: [],
    });
  });

  it('returns the shortest directed path when reachable', () => {
    const getter = vi.fn().mockReturnValue(sampleGraph);

    expect(findPath('a.ts', 'd.ts', getter)?.map((node) => node.id)).toEqual([
      'a.ts',
      'b.ts',
      'c.ts',
      'd.ts',
    ]);
    expect(findPath('d.ts', 'a.ts', getter)).toBeNull();
  });

  it('returns the start node when the source and target match', () => {
    const getter = vi.fn().mockReturnValue(sampleGraph);

    expect(findPath('b.ts', 'b.ts', getter)?.map((node) => node.id)).toEqual(['b.ts']);
  });

  it('skips already visited nodes when the graph contains a cycle', () => {
    const cyclicGraph: IGraphData = {
      nodes: [...sampleGraph.nodes, { id: 'e.ts', label: 'e.ts', color: '#fff' }],
      edges: [
        ...sampleGraph.edges,
        { id: 'c->a', from: 'c.ts', to: 'a.ts', kind: 'reference', sources: [] },
        { id: 'd->e', from: 'd.ts', to: 'e.ts', kind: 'reference', sources: [] },
      ],
    };
    const getter = vi.fn().mockReturnValue(cyclicGraph);

    expect(findPath('a.ts', 'e.ts', getter)?.map((node) => node.id)).toEqual([
      'a.ts',
      'b.ts',
      'c.ts',
      'd.ts',
      'e.ts',
    ]);
  });

  it('returns a subgraph without duplicating nodes in a cycle', () => {
    const cyclicGraph: IGraphData = {
      nodes: sampleGraph.nodes.slice(0, 3),
      edges: [
        sampleGraph.edges[0],
        sampleGraph.edges[1],
        { id: 'c->a', from: 'c.ts', to: 'a.ts', kind: 'reference', sources: [] },
      ],
    };
    const getter = vi.fn().mockReturnValue(cyclicGraph);

    expect(getSubgraph('a.ts', 2, getter)).toEqual({
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
        { id: 'c.ts', label: 'c.ts', color: '#fff' },
      ],
      edges: [
        { id: 'a->b', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] },
        { id: 'b->c', from: 'b.ts', to: 'c.ts', kind: 'import', sources: [] },
        { id: 'c->a', from: 'c.ts', to: 'a.ts', kind: 'reference', sources: [] },
      ],
    });
  });
});
