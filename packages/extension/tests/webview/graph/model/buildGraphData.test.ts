import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/types';
import { buildGraphData } from '../../../../src/webview/components/graph/model/build';

describe('graph/model/build', () => {
  it('builds nodes and links from the graph data options', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'focus.ts', label: 'focus.ts', color: '#80c0ff', depthLevel: 0, accessCount: 1 },
        { id: 'favorite.ts', label: 'favorite.ts', color: '#80c0ff', accessCount: 5 },
      ],
      edges: [
        { id: 'focus.ts->favorite.ts', from: 'focus.ts', to: 'favorite.ts' , kind: 'import', sources: [] },
        { id: 'favorite.ts->focus.ts', from: 'favorite.ts', to: 'focus.ts' , kind: 'import', sources: [] },
      ],
    };

    const graphData = buildGraphData({
      data,
      nodeSizeMode: 'access-count',
      theme: 'dark',
      favorites: new Set(['favorite.ts']),
      bidirectionalMode: 'combined',
      timelineActive: false,
    });

    expect(graphData.nodes.find(node => node.id === 'focus.ts')?.size).toBe(20.8);
    expect(graphData.nodes.find(node => node.id === 'favorite.ts')?.size).toBe(40);
    expect(graphData.links).toEqual([
      expect.objectContaining({
        id: 'favorite.ts<->focus.ts',
        bidirectional: true,
        baseColor: '#60a5fa',
      }),
    ]);
  });
});
