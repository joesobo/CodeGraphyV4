import { describe, expect, it } from 'vitest';
import { buildSubgraph } from '../../../src/core/plugins/graphQueryFacadeSubgraph';
import type { GraphDataGetter } from '../../../src/core/plugins/graphQueryFacade';
import type { IGraphData } from '../../../src/shared/graph/types';

const graphData = {
  nodes: [
    { id: 'a.ts', label: 'a.ts', color: '#fff' },
    { id: 'b.ts', label: 'b.ts', color: '#fff' },
    { id: 'c.ts', label: 'c.ts', color: '#fff' },
  ],
  edges: [
    { id: 'a-b', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] },
    { id: 'b-c', from: 'b.ts', to: 'c.ts', kind: 'import', sources: [] },
  ],
} satisfies IGraphData;

const getter: GraphDataGetter = () => graphData;

describe('graphQueryFacadeSubgraph', () => {
  it('returns an empty graph for missing nodes or negative hops', () => {
    expect(buildSubgraph('missing.ts', 1, getter)).toEqual({ nodes: [], edges: [] });
    expect(buildSubgraph('a.ts', -1, getter)).toEqual({ nodes: [], edges: [] });
  });

  it('returns the induced subgraph around the requested node', () => {
    expect(buildSubgraph('b.ts', 1, getter)).toEqual({
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
        { id: 'c.ts', label: 'c.ts', color: '#fff' },
      ],
      edges: [
        { id: 'a-b', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] },
        { id: 'b-c', from: 'b.ts', to: 'c.ts', kind: 'import', sources: [] },
      ],
    });
  });
});
