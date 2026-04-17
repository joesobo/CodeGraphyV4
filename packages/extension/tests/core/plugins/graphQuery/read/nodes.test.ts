import { describe, expect, it, vi } from 'vitest';
import { getGraph, getNeighbors, getNode } from '../../../../../src/core/plugins/graphQuery/read/nodes';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';

const sampleGraph: IGraphData = {
  nodes: [
    { id: 'a.ts', label: 'a.ts', color: '#fff' },
    { id: 'b.ts', label: 'b.ts', color: '#fff' },
    { id: 'c.ts', label: 'c.ts', color: '#fff' },
  ],
  edges: [
    { id: 'a->b', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] },
    { id: 'b->c', from: 'b.ts', to: 'c.ts', kind: 'import', sources: [] },
  ],
};

describe('core/plugins/graphQuery/nodes', () => {
  it('returns the graph snapshot and looks up nodes', () => {
    const getter = vi.fn().mockReturnValue(sampleGraph);

    expect(getGraph(getter)).toBe(sampleGraph);
    expect(getNode('a.ts', getter)?.id).toBe('a.ts');
    expect(getNode('missing', getter)).toBeNull();
  });

  it('returns neighbors connected by incoming or outgoing edges', () => {
    const getter = vi.fn().mockReturnValue(sampleGraph);

    expect(getNeighbors('b.ts', getter).map((node) => node.id)).toEqual(['a.ts', 'c.ts']);
    expect(getNeighbors('missing', getter)).toEqual([]);
  });
});
