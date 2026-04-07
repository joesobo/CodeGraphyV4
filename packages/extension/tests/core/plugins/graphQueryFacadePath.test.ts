import { describe, expect, it } from 'vitest';
import { findNodePath } from '../../../src/core/plugins/graphQueryFacadePath';
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

describe('graphQueryFacadePath', () => {
  it('returns null when either endpoint is missing', () => {
    expect(findNodePath('missing.ts', 'c.ts', getter)).toBeNull();
    expect(findNodePath('a.ts', 'missing.ts', getter)).toBeNull();
  });

  it('returns null when no directed path exists', () => {
    expect(findNodePath('c.ts', 'a.ts', getter)).toBeNull();
  });

  it('returns the path nodes when reachable', () => {
    expect(findNodePath('a.ts', 'c.ts', getter)?.map((node) => node.id)).toEqual([
      'a.ts',
      'b.ts',
      'c.ts',
    ]);
  });
});
