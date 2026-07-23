import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphViewStoreState } from '../../../../src/webview/components/graph/view/store';
import type { GraphRuntime } from '../../../../src/webview/components/graph/runtime/use/state';
import type { UseGraphInteractionRuntimeResult } from '../../../../src/webview/components/graph/runtime/use/interaction';
import { useGraphViewportModel } from '../../../../src/webview/components/graph/viewport/model';

const harness = vi.hoisted(() => ({
  buildGraphContextMenuEntries: vi.fn(() => [{ id: 'menu', kind: 'action', label: 'Menu', action: { type: 'noop' } }]),
  buildSharedGraphProps: vi.fn(() => ({ shared: true })),
  getGraphSurfaceColors: vi.fn(() => ({
    canvasBackgroundColor: 'transparent',
    containerBackgroundColor: 'var(--cg-popover-translucent)',
  })),
}));

vi.mock('../../../../src/webview/components/graph/contextMenu/build/entries', () => ({
  buildGraphContextMenuEntries: harness.buildGraphContextMenuEntries,
}));

vi.mock('../../../../src/webview/components/graph/rendering/surface/sharedProps', () => ({
  buildSharedGraphProps: harness.buildSharedGraphProps,
}));

vi.mock('../../../../src/webview/components/graph/rendering/surface/colors', () => ({
  getGraphSurfaceColors: harness.getGraphSurfaceColors,
}));

function createGraphData(): GraphRuntime['renderer']['graphData'] {
  return {
    nodes: [{
      baseOpacity: 1,
      borderColor: '#1f2937',
      borderWidth: 1,
      color: '#93C5FD',
      id: 'src/app.ts',
      isFavorite: false,
      isPinned: false,
      label: 'app.ts',
      size: 12,
    }],
    links: [],
  };
}

function createInteractions(): UseGraphInteractionRuntimeResult {
  return {
    contextMenuRuntime: {
      clearRightClickFallbackTimer: vi.fn(),
      handleContextMenu: vi.fn(),
      handleMenuAction: vi.fn(),
      handleMouseDownCapture: vi.fn(),
      handleMouseMoveCapture: vi.fn(),
      handleMouseUpCapture: vi.fn(),
    },
    handleBackgroundRightClick: vi.fn(),
    handleContextMenu: vi.fn(),
    handleEngineStop: vi.fn(),
    handleLinkRightClick: vi.fn(),
    handleMenuAction: vi.fn(),
    handleMouseDownCapture: vi.fn(),
    handleMouseLeave: vi.fn(),
    handleMouseMoveCapture: vi.fn(),
    handleMouseUpCapture: vi.fn(),
    handleNodeDrag: vi.fn(),
    handleNodeDragEnd: vi.fn(),
    handleNodeHover: vi.fn(),
    handleNodeRightClick: vi.fn(),
    hoveredNodeRef: { current: null },
    interactionHandlers: {
      fitView: vi.fn(),
      focusNodeById: vi.fn(),
      handleBackgroundClick: vi.fn(),
      handleLinkClick: vi.fn(),
      handleNodeClick: vi.fn(),
      openBackgroundContextMenu: vi.fn(),
      openEdgeContextMenu: vi.fn(),
      openNodeContextMenu: vi.fn(),
      requestNodeOpenById: vi.fn(),
      setGraphCursor: vi.fn(),
      setSelection: vi.fn(),
      zoomGraphView: vi.fn(),
    },
    setTooltipData: vi.fn(),
    stopTooltipTracking: vi.fn(),
    tooltipData: {
      visible: false,
      nodeRect: { x: 0, y: 0, radius: 0 },
      path: '',
      info: null,
      pluginActions: [],
      pluginSections: [],
    },
    tooltipTimeoutRef: { current: null },
  } as unknown as UseGraphInteractionRuntimeResult;
}

function createViewState(): Pick<GraphViewStoreState, 'favorites'> {
  return {
    favorites: new Set(['src/app.ts']),
  };
}

describe('graph/viewport/model', () => {
  beforeEach(() => {
    harness.buildGraphContextMenuEntries.mockClear();
    harness.buildSharedGraphProps.mockClear();
    harness.getGraphSurfaceColors.mockClear();
  });

  it('builds shared props, menu entries, and colors from the current graph state', () => {
    const graphData = createGraphData();
    const interactions = createInteractions();
    const handleEngineStop = vi.fn();
    const viewState = createViewState();

    const { result } = renderHook(() => useGraphViewportModel({
      graphState: {
        contextSelection: { kind: 'background', targets: [] },
        graphData,
      },
      handleEngineStop,
      interactions,
      viewportRuntime: { containerSize: { width: 480, height: 320 } },
      viewState,
    }));

    expect(harness.buildSharedGraphProps).toHaveBeenCalledWith({
      graphData,
      onBackgroundClick: interactions.interactionHandlers.handleBackgroundClick,
      onBackgroundRightClick: interactions.handleBackgroundRightClick,
      onEngineStop: handleEngineStop,
      onLinkClick: interactions.interactionHandlers.handleLinkClick,
      onLinkRightClick: interactions.handleLinkRightClick,
      onNodeClick: interactions.interactionHandlers.handleNodeClick,
      onNodeDrag: interactions.handleNodeDrag,
      onNodeDragEnd: interactions.handleNodeDragEnd,
      onNodeHover: interactions.handleNodeHover,
      onNodeRightClick: interactions.handleNodeRightClick,
      width: 480,
    });
    expect(harness.buildGraphContextMenuEntries).toHaveBeenCalledWith({
      edges: graphData.links,
      favorites: viewState.favorites,
      graphViewContributions: undefined,
      nodes: graphData.nodes,
      selection: { kind: 'background', targets: [] },
    });
    expect(harness.getGraphSurfaceColors).toHaveBeenCalledWith(undefined);
    expect(result.current).toMatchObject({
      canvasBackgroundColor: 'transparent',
      containerBackgroundColor: 'var(--cg-popover-translucent)',
      sharedProps: { shared: true },
    });
  });

  it('recomputes shared props when graph data changes', () => {
    const interactions = createInteractions();
    const graphData = createGraphData();
    const { rerender } = renderHook(({ currentGraphData }) => useGraphViewportModel({
      graphState: {
        contextSelection: { kind: 'background', targets: [] },
        graphData: currentGraphData,
      },
      handleEngineStop: vi.fn(),
      interactions,
      viewportRuntime: { containerSize: { width: 480, height: 320 } },
      viewState: createViewState(),
    }), { initialProps: { currentGraphData: graphData } });

    const nextGraphData = {
      nodes: [{ id: 'src/next.ts', label: 'next.ts', color: '#f59e0b' } as never],
      links: [],
    } as GraphRuntime['renderer']['graphData'];
    rerender({ currentGraphData: nextGraphData });

    expect(harness.buildSharedGraphProps).toHaveBeenCalledTimes(2);
    expect(harness.buildSharedGraphProps).toHaveBeenLastCalledWith(expect.objectContaining({
      graphData: nextGraphData,
    }));
  });
});
