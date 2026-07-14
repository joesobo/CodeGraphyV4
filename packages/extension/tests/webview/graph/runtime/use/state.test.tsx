import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../../../../src/shared/plugins/decorations';
import type { FGLink, FGNode } from '../../../../../src/webview/components/graph/model/build';

const graphStateHarness = vi.hoisted(() => ({
  buildGraphData: vi.fn(),
}));

vi.mock('../../../../../src/webview/components/graph/model/build', () => ({
  buildGraphData: graphStateHarness.buildGraphData,
}));

import {
  createEmptyRuntimeGraphData,
  incrementImageCacheVersion,
  useGraphRuntime,
  type GraphRuntimeOptions,
} from '../../../../../src/webview/components/graph/runtime/use/state';

function createData(suffix: string): IGraphData {
  return {
    edges: [
      {
        id: `edge-${suffix}`,
        from: `src/${suffix}.ts`,
        to: `src/${suffix}-dep.ts`,
        kind: 'import',
        sources: [],
      },
    ],
    nodes: [
      { color: '#60a5fa', id: `src/${suffix}.ts`, label: `${suffix}.ts` },
      { color: '#22c55e', id: `src/${suffix}-dep.ts`, label: `${suffix}-dep.ts` },
    ],
  };
}

function createBuiltGraph(id: string, x: number): { links: FGLink[]; nodes: FGNode[] } {
  return {
    links: [
      {
        bidirectional: false,
        from: `src/${id}.ts`,
        id: `edge-${id}`,
        kind: 'import',
        source: `src/${id}.ts`,
        sources: [],
        target: `src/${id}-dep.ts`,
        to: `src/${id}-dep.ts`,
      } as FGLink,
    ],
    nodes: [
      {
        baseOpacity: 1,
        borderColor: '#1d4ed8',
        borderWidth: 2,
        color: '#60a5fa',
        id: `src/${id}.ts`,
        isFavorite: false,
        label: `${id}.ts`,
        size: 16,
        x,
        y: x + 1,
      } as FGNode,
    ],
  };
}

function createOptions(
  overrides: Partial<GraphRuntimeOptions> = {},
): GraphRuntimeOptions {
  return {
    bidirectionalMode: 'combined',
    data: createData('alpha'),
    directionColor: '#334155',
    directionMode: 'arrows',
    edgeDecorations: undefined,
    favorites: new Set<string>(['src/alpha.ts']),
    nodeDecorations: undefined,
    nodeSizeMode: 'connections',
    showLabels: true,
    theme: 'dark',
    ...overrides,
  };
}

describe('graph/runtime/useGraphRuntime', () => {
  beforeEach(() => {
    graphStateHarness.buildGraphData.mockReset();
    graphStateHarness.buildGraphData.mockReturnValue(createBuiltGraph('alpha', 10));
  });

  it('creates empty runtime graph data for the initial previous-node snapshot', () => {
    expect(createEmptyRuntimeGraphData()).toEqual({
      links: [],
      nodes: [],
    });
  });

  it('increments the image cache version by one per update', () => {
    expect(incrementImageCacheVersion(0)).toBe(1);
    expect(incrementImageCacheVersion(1)).toBe(2);
  });

  it('initializes refs and state from their expected defaults', () => {
    const { result } = renderHook(() => useGraphRuntime(createOptions()));

    expect(graphStateHarness.buildGraphData).toHaveBeenCalledWith(expect.objectContaining({
      previousNodes: [],
    }));
    expect(result.current.renderer.containerRef.current).toBeNull();
    expect(result.current.renderer.fg2dRef.current).toBeUndefined();
    expect(result.current.graphCursorRef.current).toBe('default');
    expect(result.current.renderer.graphDataRef.current).toBe(result.current.renderer.graphData);
    expect(result.current.renderCaches.imageCacheVersion).toBe(0);
    expect(result.current.highlightedNeighborsRef.current).toEqual(new Set());
    expect(result.current.selection.selectedNodeIds).toEqual([]);
    expect(result.current.selection.selectedNodeIdsRef.current).toEqual(new Set());
    expect(result.current.context.selection).toEqual({ kind: 'background', targets: [] });
  });

  it('rebuilds graph data when favorites change', () => {
    const firstGraph = createBuiltGraph('alpha', 10);
    const secondGraph = createBuiltGraph('alpha', 30);
    const initialOptions = createOptions();
    const nextFavorites = new Set<string>(['src/beta.ts']);
    graphStateHarness.buildGraphData
      .mockReturnValueOnce(firstGraph)
      .mockReturnValueOnce(secondGraph);

    const { result, rerender } = renderHook(
      (options: GraphRuntimeOptions) => useGraphRuntime(options),
      { initialProps: initialOptions },
    );

    rerender(createOptions({
      data: initialOptions.data,
      favorites: nextFavorites,
    }));

    expect(graphStateHarness.buildGraphData).toHaveBeenCalledTimes(2);
    expect(graphStateHarness.buildGraphData).toHaveBeenNthCalledWith(2, expect.objectContaining({
      favorites: nextFavorites,
      previousNodes: firstGraph.nodes,
    }));
    expect(result.current.renderer.graphData).toBe(secondGraph);
    expect(result.current.favoritesRef.current).toBe(nextFavorites);
  });

  it('updates mutable refs across rerender without rebuilding graph data for non-memo inputs', () => {
    const initialOptions = createOptions();
    const nextNodeDecorations: Record<string, NodeDecorationPayload> = {
      'src/beta.ts': { color: '#f59e0b' },
    };
    const nextEdgeDecorations: Record<string, EdgeDecorationPayload> = {
      'edge-alpha': { color: '#ef4444' },
    };
    const { result, rerender } = renderHook(
      (options: GraphRuntimeOptions) => useGraphRuntime(options),
      { initialProps: initialOptions },
    );
    const firstGraphData = result.current.renderer.graphData;

    rerender(createOptions({
      data: initialOptions.data,
      directionColor: '#f59e0b',
      directionMode: 'particles',
      edgeDecorations: nextEdgeDecorations,
      favorites: initialOptions.favorites,
      nodeDecorations: nextNodeDecorations,
      showLabels: false,
      theme: 'light',
    }));

    expect(graphStateHarness.buildGraphData).toHaveBeenCalledTimes(1);
    expect(result.current.renderer.graphData).toBe(firstGraphData);
    expect(result.current.themeRef.current).toBe('light');
    expect(result.current.directionModeRef.current).toBe('particles');
    expect(result.current.directionColorRef.current).toBe('#f59e0b');
    expect(result.current.favoritesRef.current).toBe(initialOptions.favorites);
    expect(result.current.showLabelsRef.current).toBe(false);
    expect(result.current.nodeDecorationsRef.current).toBe(nextNodeDecorations);
    expect(result.current.edgeDecorationsRef.current).toBe(nextEdgeDecorations);
  });

  it('rebuilds graph data when node sizing changes and preserves positions', () => {
    const firstGraph = createBuiltGraph('alpha', 10);
    const secondGraph = createBuiltGraph('alpha', 30);
    const initialOptions = createOptions({ nodeSizeMode: 'connections' });
    graphStateHarness.buildGraphData
      .mockReturnValueOnce(firstGraph)
      .mockReturnValueOnce(secondGraph);

    const { result, rerender } = renderHook(
      (options: GraphRuntimeOptions) => useGraphRuntime(options),
      { initialProps: initialOptions },
    );

    rerender(createOptions({
      data: initialOptions.data,
      favorites: initialOptions.favorites,
      nodeSizeMode: 'connections',
    }));

    expect(graphStateHarness.buildGraphData).toHaveBeenCalledTimes(2);
    expect(graphStateHarness.buildGraphData).toHaveBeenNthCalledWith(2, expect.objectContaining({
      nodeSizeMode: 'connections',
      previousNodes: firstGraph.nodes,
    }));
    expect(result.current.renderer.graphData).toBe(secondGraph);
  });

  it('rebuilds graph data when the memo inputs change and passes forward previous nodes', () => {
    const firstGraph = createBuiltGraph('alpha', 10);
    const secondGraph = createBuiltGraph('beta', 30);
    const firstData = createData('alpha');
    const secondData = createData('beta');

    graphStateHarness.buildGraphData
      .mockReturnValueOnce(firstGraph)
      .mockReturnValueOnce(secondGraph);

    const { result, rerender } = renderHook(
      (options: GraphRuntimeOptions) => useGraphRuntime(options),
      { initialProps: createOptions({ data: firstData, bidirectionalMode: 'combined' }) },
    );

    expect(graphStateHarness.buildGraphData).toHaveBeenNthCalledWith(1, expect.objectContaining({
      bidirectionalMode: 'combined',
      data: firstData,
      previousNodes: [],
    }));

    rerender(createOptions({ data: secondData, bidirectionalMode: 'separate' }));

    expect(graphStateHarness.buildGraphData).toHaveBeenCalledTimes(2);
    expect(graphStateHarness.buildGraphData).toHaveBeenNthCalledWith(2, expect.objectContaining({
      bidirectionalMode: 'separate',
      data: secondData,
      previousNodes: firstGraph.nodes,
    }));
    expect(result.current.renderer.graphData).toBe(secondGraph);
    expect(result.current.renderer.graphDataRef.current).toBe(secondGraph);
  });

  it('clears selected nodes that are no longer visible after graph data changes', () => {
    const firstGraph = createBuiltGraph('alpha', 10);
    const secondGraph = createBuiltGraph('beta', 30);
    graphStateHarness.buildGraphData
      .mockReturnValueOnce(firstGraph)
      .mockReturnValueOnce(secondGraph);

    const { result, rerender } = renderHook(
      (options: GraphRuntimeOptions) => useGraphRuntime(options),
      { initialProps: createOptions({ data: createData('alpha') }) },
    );

    act(() => {
      result.current.selection.selectedNodeIdsRef.current = new Set(['src/alpha.ts']);
      result.current.selection.setSelectedNodeIds(['src/alpha.ts']);
    });

    rerender(createOptions({ data: createData('beta') }));

    expect(result.current.selection.selectedNodeIds).toEqual([]);
    expect(result.current.selection.selectedNodeIdsRef.current).toEqual(new Set());
  });

  it('triggerImageRerender causes a rerender without rebuilding graph data', () => {
    const options = createOptions();
    const { result } = renderHook(() => useGraphRuntime(options));
    const firstGraphData = result.current.renderer.graphData;

    act(() => {
      result.current.renderCaches.invalidateImages();
    });

    expect(result.current.renderCaches.imageCacheVersion).toBe(1);
    expect(graphStateHarness.buildGraphData).toHaveBeenCalledTimes(1);
    expect(result.current.renderer.graphData).toBe(firstGraphData);

    act(() => {
      result.current.renderCaches.invalidateImages();
    });

    expect(result.current.renderCaches.imageCacheVersion).toBe(2);
    expect(graphStateHarness.buildGraphData).toHaveBeenCalledTimes(1);
    expect(result.current.renderer.graphData).toBe(firstGraphData);
  });
});
