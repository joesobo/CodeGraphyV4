import { describe, expect, it, vi } from 'vitest';
import { findPath, getSubgraph } from '../../../src/core/plugins/graphQueryFacadeTraversal';
import type { IGraphData } from '../../../src/shared/graph/types';

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

describe('core/plugins/graphQueryFacadeTraversal', () => {
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
});
