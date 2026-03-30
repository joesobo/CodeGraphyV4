import { describe, expect, it } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../../src/shared/fileColors';
import type { IGraphData } from '../../../../src/shared/graph/types';
import {
  buildGraphData,
  calculateNodeSizes,
  FAVORITE_BORDER_COLOR,
  getDepthOpacity,
  getDepthSizeMultiplier,
  getNodeType,
  processEdges,
  resolveDirectionColor,
} from '../../../../src/webview/components/graph/model/build';

describe('graph/model/build', () => {
  it('keeps valid direction colors', () => {
    expect(resolveDirectionColor('#123ABC')).toBe('#123ABC');
  });

  it('falls back to the default direction color for invalid colors', () => {
    expect(resolveDirectionColor('blue')).toBe(DEFAULT_DIRECTION_COLOR);
  });

  it('uses the default size for uniform node sizing', () => {
    const sizes = calculateNodeSizes(
      [
        { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
        { id: 'b.ts', label: 'b.ts', color: '#67E8F9' },
      ],
      [],
      'uniform'
    );

    expect(sizes.get('a.ts')).toBe(16);
    expect(sizes.get('b.ts')).toBe(16);
  });

  it('scales connection-based node sizes by edge count', () => {
    const sizes = calculateNodeSizes(
      [
        { id: 'hub.ts', label: 'hub.ts', color: '#93C5FD' },
        { id: 'leaf-a.ts', label: 'leaf-a.ts', color: '#67E8F9' },
        { id: 'leaf-b.ts', label: 'leaf-b.ts', color: '#67E8F9' },
      ],
      [
        { from: 'hub.ts', to: 'leaf-a.ts' },
        { from: 'hub.ts', to: 'leaf-b.ts' },
      ],
      'connections'
    );

    expect(sizes.get('hub.ts')).toBe(40);
    expect(sizes.get('leaf-a.ts')).toBe(25);
    expect(sizes.get('leaf-b.ts')).toBe(25);
  });

  it('returns default sizes when file-size mode has no positive file sizes', () => {
    const sizes = calculateNodeSizes(
      [
        { id: 'empty.ts', label: 'empty.ts', color: '#93C5FD' },
        { id: 'zero.ts', label: 'zero.ts', color: '#67E8F9', fileSize: 0 },
      ],
      [],
      'file-size'
    );

    expect(sizes.get('empty.ts')).toBe(16);
    expect(sizes.get('zero.ts')).toBe(16);
  });

  it('returns lower opacity for deeper nodes', () => {
    expect(getDepthOpacity(undefined)).toBe(1);
    expect(getDepthOpacity(0)).toBe(1);
    expect(getDepthOpacity(2)).toBe(0.7);
    expect(getDepthOpacity(10)).toBe(0.4);
  });

  it('increases the size multiplier only for focused nodes', () => {
    expect(getDepthSizeMultiplier(undefined)).toBe(1);
    expect(getDepthSizeMultiplier(0)).toBe(1.3);
    expect(getDepthSizeMultiplier(2)).toBe(1);
  });

  it('returns a wildcard node type for files without a usable extension', () => {
    expect(getNodeType('README')).toBe('*');
    expect(getNodeType('folder/file.')).toBe('*');
  });

  it('normalizes node types to lower-case extensions', () => {
    expect(getNodeType('Folder/App.TSX')).toBe('.tsx');
  });

  it('combines reverse edges into one bidirectional edge in combined mode', () => {
    expect(
      processEdges(
      [
        { id: 'b.ts->a.ts', from: 'b.ts', to: 'a.ts' },
        { id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' },
        ],
        'combined'
      )
    ).toEqual([
      { id: 'a.ts<->b.ts', from: 'a.ts', to: 'b.ts', bidirectional: true },
    ]);
  });

  it('keeps each edge separate in separate mode', () => {
    expect(
      processEdges(
      [
        { id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' },
        { id: 'b.ts->a.ts', from: 'b.ts', to: 'a.ts' },
        ],
        'separate'
      )
    ).toEqual([
      { id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts', bidirectional: false },
      { id: 'b.ts->a.ts', from: 'b.ts', to: 'a.ts', bidirectional: false },
    ]);
  });

  it('preserves previous positions and seeds new timeline nodes near connected neighbors', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'anchor.ts', label: 'anchor.ts', color: '#93C5FD' },
        { id: 'new.ts', label: 'new.ts', color: '#67E8F9' },
      ],
      edges: [{ id: 'anchor.ts->new.ts', from: 'anchor.ts', to: 'new.ts' }],
    };

    const graphData = buildGraphData({
      data,
      nodeSizeMode: 'uniform',
      theme: 'dark',
      favorites: new Set(),
      bidirectionalMode: 'separate',
      timelineActive: true,
      previousNodes: [{ id: 'anchor.ts', x: 100, y: 200 }],
      random: () => 0.75,
    });

    expect(graphData.nodes.find(node => node.id === 'anchor.ts')).toMatchObject({ x: 100, y: 200 });
    expect(graphData.nodes.find(node => node.id === 'new.ts')).toMatchObject({ x: 110, y: 210 });
  });

  it('applies focused and favorite borders while building graph data', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'focus.ts', label: 'focus.ts', color: '#80c0ff', depthLevel: 0 },
        { id: 'favorite.ts', label: 'favorite.ts', color: '#80c0ff' },
      ],
      edges: [
        { id: 'focus.ts->favorite.ts', from: 'focus.ts', to: 'favorite.ts' },
        { id: 'favorite.ts->focus.ts', from: 'favorite.ts', to: 'focus.ts' },
      ],
    };

    const graphData = buildGraphData({
      data,
      nodeSizeMode: 'uniform',
      theme: 'light',
      favorites: new Set(['favorite.ts']),
      bidirectionalMode: 'combined',
      timelineActive: false,
    });

    expect(graphData.nodes.find(node => node.id === 'focus.ts')).toMatchObject({
      borderColor: '#2563eb',
      borderWidth: 4,
      baseOpacity: 1,
    });
    expect(graphData.nodes.find(node => node.id === 'favorite.ts')).toMatchObject({
      borderColor: FAVORITE_BORDER_COLOR,
      borderWidth: 3,
    });
    expect(graphData.links).toEqual([
      expect.objectContaining({
        id: 'favorite.ts<->focus.ts',
        bidirectional: true,
        baseColor: '#60a5fa',
      }),
    ]);
  });
});
