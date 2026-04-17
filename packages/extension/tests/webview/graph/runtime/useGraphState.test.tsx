import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../../../src/shared/plugins/decorations';
import type { FGLink, FGNode } from '../../../../src/webview/components/graph/model/build';

const graphStateHarness = vi.hoisted(() => ({
  as2DExtMethods: vi.fn(),
  buildGraphData: vi.fn(),
}));

vi.mock('../../../../src/webview/components/graph/model/build', () => ({
  buildGraphData: graphStateHarness.buildGraphData,
}));

vi.mock('../../../../src/webview/components/graph/support/contracts', () => ({
  as2DExtMethods: graphStateHarness.as2DExtMethods,
}));

import {
  applyTimelineAlpha,
  createEmptyRuntimeGraphData,
  incrementImageCacheVersion,
  useGraphState,
  type UseGraphStateOptions,
} from '../../../../src/webview/components/graph/runtime/use/graph/state';

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
  overrides: Partial<UseGraphStateOptions> = {},
): UseGraphStateOptions {
  return {
    bidirectionalMode: 'combined',
    data: createData('alpha'),
    directionColor: '#334155',
    directionMode: 'arrows',
    edgeDecorations: undefined,
    favorites: new Set<string>(['src/alpha.ts']),
    nodeDecorations: undefined,
    nodeSizeMode: 'uniform',
    showLabels: true,
    theme: 'dark',
    timelineActive: false,
    ...overrides,
  };
}

describe('graph/runtime/useGraphState', () => {
  let frameCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    frameCallbacks = [];
    graphStateHarness.as2DExtMethods.mockReset();
    graphStateHarness.buildGraphData.mockReset();
    graphStateHarness.buildGraphData.mockReturnValue(createBuiltGraph('alpha', 10));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('applies timeline alpha only when the graph exposes a d3Alpha function', () => {
    const graph = { d3Alpha: vi.fn() };

    expect(() => {
      applyTimelineAlpha(undefined);
      applyTimelineAlpha({});
      applyTimelineAlpha(graph, 0.1);
    }).not.toThrow();

    expect(graph.d3Alpha).toHaveBeenCalledTimes(1);
    expect(graph.d3Alpha).toHaveBeenCalledWith(0.1);
  });

  it('initializes refs and state from their expected defaults', () => {
    const { result } = renderHook(() => useGraphState(createOptions()));

    expect(graphStateHarness.buildGraphData).toHaveBeenCalledWith(expect.objectContaining({
      previousNodes: [],
    }));
    expect(result.current.containerRef.current).toBeNull();
    expect(result.current.fg2dRef.current).toBeUndefined();
    expect(result.current.fg3dRef.current).toBeUndefined();
    expect(result.current.graphCursorRef.current).toBe('default');
    expect(result.current.graphDataRef.current).toBe(result.current.graphData);
    expect(result.current.imageCacheVersion).toBe(0);
    expect(result.current.highlightedNeighborsRef.current).toEqual(new Set());
    expect(result.current.selectedNodes).toEqual([]);
    expect(result.current.selectedNodesSetRef.current).toEqual(new Set());
    expect(result.current.contextSelection).toEqual({ kind: 'background', targets: [] });
  });

  it('updates mutable refs across rerender without rebuilding graph data for non-memo inputs', () => {
    const initialOptions = createOptions();
    const nextFavorites = new Set<string>(['src/beta.ts']);
    const nextNodeDecorations: Record<string, NodeDecorationPayload> = {
      'src/beta.ts': { color: '#f59e0b' },
    };
    const nextEdgeDecorations: Record<string, EdgeDecorationPayload> = {
      'edge-alpha': { color: '#ef4444' },
    };
    const { result, rerender } = renderHook(
      (options: UseGraphStateOptions) => useGraphState(options),
      { initialProps: initialOptions },
    );
    const firstGraphData = result.current.graphData;

    rerender(createOptions({
      data: initialOptions.data,
      directionColor: '#f59e0b',
      directionMode: 'particles',
      edgeDecorations: nextEdgeDecorations,
      favorites: nextFavorites,
      nodeDecorations: nextNodeDecorations,
      nodeSizeMode: 'file-size',
      showLabels: false,
      theme: 'light',
      timelineActive: true,
    }));

    expect(graphStateHarness.buildGraphData).toHaveBeenCalledTimes(1);
    expect(result.current.graphData).toBe(firstGraphData);
    expect(result.current.themeRef.current).toBe('light');
    expect(result.current.directionModeRef.current).toBe('particles');
    expect(result.current.directionColorRef.current).toBe('#f59e0b');
    expect(result.current.favoritesRef.current).toBe(nextFavorites);
    expect(result.current.nodeSizeModeRef.current).toBe('file-size');
    expect(result.current.showLabelsRef.current).toBe(false);
    expect(result.current.nodeDecorationsRef.current).toBe(nextNodeDecorations);
    expect(result.current.edgeDecorationsRef.current).toBe(nextEdgeDecorations);
    expect(result.current.timelineActiveRef.current).toBe(true);
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
      (options: UseGraphStateOptions) => useGraphState(options),
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
    expect(result.current.graphData).toBe(secondGraph);
    expect(result.current.graphDataRef.current).toBe(secondGraph);
  });

  it('does not schedule a timeline alpha bump when the timeline is inactive', () => {
    const graph = { d3Alpha: vi.fn() };
    graphStateHarness.as2DExtMethods.mockReturnValue(graph);

    renderHook(() => useGraphState(createOptions({ timelineActive: false })));

    expect(graphStateHarness.as2DExtMethods).not.toHaveBeenCalled();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(graph.d3Alpha).not.toHaveBeenCalled();
  });

  it('does not schedule a timeline alpha bump when the 2D graph api is unavailable', () => {
    graphStateHarness.as2DExtMethods.mockReturnValue(undefined);

    renderHook(() => useGraphState(createOptions({ timelineActive: true })));

    expect(graphStateHarness.as2DExtMethods).toHaveBeenCalledTimes(1);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('keeps the data effect safe when the graph api has no d3Alpha function', () => {
    graphStateHarness.as2DExtMethods.mockReturnValue({});

    renderHook(() => useGraphState(createOptions({ timelineActive: true })));

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(() => {
      act(() => {
        frameCallbacks[0](16);
      });
    }).not.toThrow();
  });

  it('schedules a low alpha bump when the timeline is active and reruns it when graph data changes', () => {
    const graph = { d3Alpha: vi.fn() };
    const firstData = createData('alpha');
    const secondData = createData('beta');
    graphStateHarness.as2DExtMethods.mockReturnValue(graph);

    const { rerender } = renderHook(
      (options: UseGraphStateOptions) => useGraphState(options),
      { initialProps: createOptions({ data: firstData, timelineActive: true }) },
    );

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    act(() => {
      frameCallbacks[0](16);
    });
    expect(graph.d3Alpha).toHaveBeenCalledWith(0.05);

    rerender(createOptions({ data: secondData, timelineActive: true }));

    expect(graphStateHarness.buildGraphData).toHaveBeenCalledTimes(2);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
    act(() => {
      frameCallbacks[1](32);
    });
    expect(graph.d3Alpha).toHaveBeenCalledTimes(2);
  });

  it('triggerImageRerender causes a rerender without rebuilding graph data', () => {
    const options = createOptions();
    const { result } = renderHook(() => useGraphState(options));
    const firstGraphData = result.current.graphData;

    act(() => {
      result.current.triggerImageRerender();
    });

    expect(result.current.imageCacheVersion).toBe(1);
    expect(graphStateHarness.buildGraphData).toHaveBeenCalledTimes(1);
    expect(result.current.graphData).toBe(firstGraphData);

    act(() => {
      result.current.triggerImageRerender();
    });

    expect(result.current.imageCacheVersion).toBe(2);
    expect(graphStateHarness.buildGraphData).toHaveBeenCalledTimes(1);
    expect(result.current.graphData).toBe(firstGraphData);
  });
});
