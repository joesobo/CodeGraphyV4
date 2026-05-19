import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { buildGraphData } from '../../../../src/webview/components/graph/model/build';

describe('graph/model/build', () => {
  it('builds nodes and links from the graph data options', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'focus.ts', label: 'focus.ts', color: '#80c0ff', depthLevel: 0, churn: 1 },
        { id: 'favorite.ts', label: 'favorite.ts', color: '#80c0ff', churn: 5 },
      ],
      edges: [
        { id: 'focus.ts->favorite.ts', from: 'focus.ts', to: 'favorite.ts' , kind: 'import', sources: [] },
        { id: 'favorite.ts->focus.ts', from: 'favorite.ts', to: 'focus.ts' , kind: 'import', sources: [] },
      ],
    };

    const graphData = buildGraphData({
      data,
      nodeSizeMode: 'churn',
      theme: 'dark',
      favorites: new Set(['favorite.ts']),
      bidirectionalMode: 'combined',
      timelineActive: false,
    });

    expect(graphData.nodes.find(node => node.id === 'focus.ts')?.size).toBe(20.8);
    expect(graphData.nodes.find(node => node.id === 'favorite.ts')?.size).toBe(40);
    expect(graphData.links).toEqual([
      expect.objectContaining({
        id: 'favorite.ts<->focus.ts#import',
        bidirectional: true,
        baseColor: '#60a5fa',
      }),
    ]);
  });

  it('does not synthesize Organize Graph Sections without graph view contributions', () => {
    const graphData = buildGraphData({
      data: {
        nodes: [
          { id: 'outside.ts', label: 'outside.ts', color: '#80c0ff' },
          { id: 'src/a.ts', label: 'a.ts', color: '#80c0ff' },
          { id: 'src/b.ts', label: 'b.ts', color: '#80c0ff' },
        ],
        edges: [
          { id: 'outside.ts->src/a.ts#import', from: 'outside.ts', to: 'src/a.ts', kind: 'import', sources: [] },
          { id: 'outside.ts->src/b.ts#import', from: 'outside.ts', to: 'src/b.ts', kind: 'import', sources: [] },
          { id: 'outside.ts->src/b.ts#call', from: 'outside.ts', to: 'src/b.ts', kind: 'call', sources: [] },
          { id: 'src/a.ts->src/b.ts#import', from: 'src/a.ts', to: 'src/b.ts', kind: 'import', sources: [] },
        ],
      },
      nodeSizeMode: 'uniform',
      theme: 'dark',
      favorites: new Set(),
      bidirectionalMode: 'separate',
      graphMode: '2d',
      graphLayout: {
        collapsedNodes: {},
        pinnedNodes: {},
        sections: {
          'section-1': {
            id: 'section-1',
            label: 'UI Layer',
            color: '#60a5fa',
            x: 0,
            y: 0,
            width: 280,
            height: 180,
            collapsed: true,
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
        },
        ownership: {
          'section-1': {
            itemId: 'section-1',
            itemKind: 'section',
            ownerSectionId: null,
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
          'src/a.ts': {
            itemId: 'src/a.ts',
            itemKind: 'node',
            ownerSectionId: 'section-1',
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
          'src/b.ts': {
            itemId: 'src/b.ts',
            itemKind: 'node',
            ownerSectionId: 'section-1',
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
        },
      },
      timelineActive: false,
    });

    expect(graphData.nodes.map(node => node.id).sort()).toEqual([
      'outside.ts',
      'src/a.ts',
      'src/b.ts',
    ]);
    expect(graphData.nodes.some(node => node.isGraphSection)).toBe(false);
    expect(graphData.links.map(link => link.id).sort()).toEqual([
      'outside.ts->src/a.ts#import',
      'outside.ts->src/b.ts#call',
      'outside.ts->src/b.ts#import',
      'src/a.ts->src/b.ts#import',
    ]);
    expect(graphData.links.some(link => link.projectedEdgeCount !== undefined)).toBe(false);
  });
});
