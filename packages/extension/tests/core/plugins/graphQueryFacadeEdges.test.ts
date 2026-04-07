import { describe, expect, it, vi } from 'vitest';
import {
  filterEdgesByKind,
  getEdgesFor,
  getIncomingEdges,
  getOutgoingEdges,
} from '../../../src/core/plugins/graphQueryFacadeEdges';
import type { IGraphData } from '../../../src/shared/graph/types';

const sampleGraph: IGraphData = {
  nodes: [
    { id: 'a.ts', label: 'a.ts', color: '#fff' },
    { id: 'b.ts', label: 'b.ts', color: '#fff' },
    { id: 'c.ts', label: 'c.ts', color: '#fff' },
  ],
  edges: [
    { id: 'a->b', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] },
    { id: 'b->c', from: 'b.ts', to: 'c.ts', kind: 'reference', sources: [] },
  ],
};

describe('core/plugins/graphQueryFacadeEdges', () => {
  it('returns incoming, outgoing, and all edges for a node', () => {
    const getter = vi.fn().mockReturnValue(sampleGraph);

    expect(getIncomingEdges('b.ts', getter).map((edge) => edge.id)).toEqual(['a->b']);
    expect(getOutgoingEdges('b.ts', getter).map((edge) => edge.id)).toEqual(['b->c']);
    expect(getEdgesFor('b.ts', getter).map((edge) => edge.id)).toEqual(['a->b', 'b->c']);
  });

  it('filters edges by one or more kinds', () => {
    const getter = vi.fn().mockReturnValue(sampleGraph);

    expect(filterEdgesByKind('reference', getter).map((edge) => edge.id)).toEqual(['b->c']);
    expect(filterEdgesByKind(['import', 'reference'], getter)).toHaveLength(2);
  });
});
