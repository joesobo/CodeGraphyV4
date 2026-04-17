import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { getEdgesByKeys, getGraphIndex } from '../../../../src/core/plugins/graphQuery/cache';

const graph: IGraphData = {
  nodes: [
    { id: 'a', label: 'a', color: '#fff' },
    { id: 'b', label: 'b', color: '#fff' },
  ],
  edges: [
    { id: 'a-b', from: 'a', to: 'b', kind: 'import', sources: [] },
    { id: 'skip', from: 'a', to: 'missing', kind: 'reference', sources: [] },
  ],
};

describe('core/plugins/graphQuery/cache', () => {
  it('indexes only edges whose endpoints exist in the graph', () => {
    const index = getGraphIndex(graph);

    expect(index.nodeById.get('a')?.id).toBe('a');
    expect(index.graph.getNodeAttributes('a')).toEqual({ node: graph.nodes[0] });
    expect(index.graph.getEdgeAttributes('a-b')).toEqual({ edge: graph.edges[0] });
    expect(index.edgeById.has('a-b')).toBe(true);
    expect(index.edgeById.has('skip')).toBe(false);
  });

  it('returns indexed edges by key and ignores missing ones', () => {
    const index = getGraphIndex(graph);

    expect(getEdgesByKeys(['a-b', 'missing'], index.edgeById)).toEqual([
      { id: 'a-b', from: 'a', to: 'b', kind: 'import', sources: [] },
    ]);
  });

  it('reuses the cached index for the same graph object', () => {
    const first = getGraphIndex(graph);
    const second = getGraphIndex(graph);

    expect(second).toBe(first);
  });
});
