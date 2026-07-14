import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { buildGraphData } from '../../../../src/webview/components/graph/model/build';

describe('graph/model/build', () => {
  it('builds nodes and links from the graph data options', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'focus.ts', label: 'focus.ts', color: '#80c0ff', depthLevel: 0 },
        { id: 'favorite.ts', label: 'favorite.ts', color: '#80c0ff' },
      ],
      edges: [
        { id: 'focus.ts->favorite.ts', from: 'focus.ts', to: 'favorite.ts' , kind: 'import', sources: [] },
        { id: 'favorite.ts->focus.ts', from: 'favorite.ts', to: 'focus.ts' , kind: 'import', sources: [] },
      ],
    };

    const graphData = buildGraphData({
      data,
      nodeSizeMode: 'connections',
      theme: 'dark',
      favorites: new Set(['favorite.ts']),
      bidirectionalMode: 'combined',
    });

    expect(graphData.nodes.find(node => node.id === 'focus.ts')?.size).toBe(10.4);
    expect(graphData.nodes.find(node => node.id === 'favorite.ts')?.size).toBe(8);
    expect(graphData.links).toEqual([
      expect.objectContaining({
        id: 'favorite.ts<->focus.ts#import',
        bidirectional: true,
        baseColor: '#60a5fa',
      }),
    ]);
  });

  it('keeps focused nodes within the shared semantic size range', () => {
    const leaves = Array.from({ length: 100 }, (_, index) => ({
      id: `leaf-${index}.ts`,
      label: `leaf-${index}.ts`,
      color: '#80c0ff',
    }));
    const graphData = buildGraphData({
      data: {
        nodes: [
          { id: 'focus.ts', label: 'focus.ts', color: '#80c0ff', depthLevel: 0 },
          ...leaves,
        ],
        edges: leaves.map(leaf => ({
          id: `focus.ts->${leaf.id}`,
          from: 'focus.ts',
          to: leaf.id,
          kind: 'import',
          sources: [],
        })),
      },
      nodeSizeMode: 'connections',
      theme: 'dark',
      favorites: new Set(),
      bidirectionalMode: 'combined',
    });

    expect(graphData.nodes.find(node => node.id === 'focus.ts')?.size).toBe(30);
  });
});
