import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  GraphContextMenuAction,
  GraphContextSelection,
} from '../../../../../src/webview/components/graph/contextMenu/contracts';
import type { FGLink, FGNode } from '../../../../../src/webview/components/graph/model/build';
import { useGraphInteractionRuntime } from '../../../../../src/webview/components/graph/runtime/use/interaction';
import type { UseGraphInteractionRuntimeOptions } from '../../../../../src/webview/components/graph/runtime/use/interaction/contracts';

const interactionRuntimeHarness = vi.hoisted(() => ({
  applyCursorToGraphSurface: vi.fn(),
  createGraphContextMenuRuntime: vi.fn(),
  createGraphInteractionHandlers: vi.fn(),
  postMessage: vi.fn(),
  useGraphMarqueeSelectionRuntime: vi.fn(),
  useGraphTooltip: vi.fn(),
  useGraphViewportPanRuntime: vi.fn(),
}));

vi.mock('../../../../../src/webview/components/graph/contextMenuRuntime/controller', () => ({
  createGraphContextMenuRuntime: interactionRuntimeHarness.createGraphContextMenuRuntime,
}));

vi.mock('../../../../../src/webview/components/graph/interactionRuntime/handlers', () => ({
  createGraphInteractionHandlers: interactionRuntimeHarness.createGraphInteractionHandlers,
}));

vi.mock('../../../../../src/webview/components/graph/support/dom', () => ({
  applyCursorToGraphSurface: interactionRuntimeHarness.applyCursorToGraphSurface,
}));

vi.mock('../../../../../src/webview/components/graph/runtime/use/tooltip/hook', () => ({
  useGraphTooltip: interactionRuntimeHarness.useGraphTooltip,
}));

vi.mock('../../../../../src/webview/components/graph/runtime/use/interaction/marquee/hook', () => ({
  useGraphMarqueeSelectionRuntime: interactionRuntimeHarness.useGraphMarqueeSelectionRuntime,
}));

vi.mock('../../../../../src/webview/components/graph/runtime/use/interaction/viewportPan/hook', () => ({
  useGraphViewportPanRuntime: interactionRuntimeHarness.useGraphViewportPanRuntime,
}));

vi.mock('../../../../../src/webview/vscodeApi', () => ({
  postMessage: interactionRuntimeHarness.postMessage,
}));

function createInteractionHandlers() {
  return {
    fitView: vi.fn(),
    focusNodeById: vi.fn(),
    openBackgroundContextMenu: vi.fn(),
    openEdgeContextMenu: vi.fn(),
    openNodeContextMenu: vi.fn(),
    requestNodeOpenById: vi.fn(),
    sendGraphInteraction: vi.fn(),
    setGraphCursor: vi.fn(),
  };
}

function createContextMenuRuntime() {
  return {
    clearRightClickFallbackTimer: vi.fn(),
    handleContextMenu: vi.fn(),
    handleMenuAction: vi.fn(),
    handleMouseDownCapture: vi.fn(),
    handleMouseMoveCapture: vi.fn(),
    handleMouseUpCapture: vi.fn(),
  };
}

function createTooltipRuntime() {
  return {
    handleMouseLeave: vi.fn(),
    handleNodeHover: vi.fn(),
    hoveredNodeRef: { current: null },
    setTooltipData: vi.fn(),
    stopTooltipTracking: vi.fn(),
    tooltipData: { visible: false },
    tooltipTimeoutRef: { current: null },
  };
}

function createViewportPanRuntime() {
  return {
    handleMouseDownCapture: vi.fn(),
    handleMouseMoveCapture: vi.fn(),
    handleMouseUpCapture: vi.fn(),
  };
}

function createMarqueeRuntime() {
  return {
    clearMarqueeSelection: vi.fn(),
    handleMouseDownCapture: vi.fn(),
    handleMouseMoveCapture: vi.fn(),
    handleMouseUpCapture: vi.fn(),
    marqueeSelection: null,
  };
}

function createNode(id: string): FGNode {
  return { id } as FGNode;
}

function createLink(id: string): FGLink {
  return { id } as FGLink;
}

function createSelection(targets: string[]): GraphContextSelection {
  return {
    kind: targets.length > 0 ? 'node' : 'background',
    targets,
  };
}

type RuntimeOptionsOverrides = Omit<Partial<UseGraphInteractionRuntimeOptions>, 'refs'> & {
  refs?: Partial<UseGraphInteractionRuntimeOptions['refs']>;
};

function createRuntimeOptions(
  overrides: RuntimeOptionsOverrides = {},
): UseGraphInteractionRuntimeOptions {
  const baseRefs: UseGraphInteractionRuntimeOptions['refs'] = {
    containerRef: { current: document.createElement('div') },
    fg2dRef: { current: undefined },
    rightClickFallbackTimerRef: { current: null },
    rightMouseDownRef: { current: null },
    selectedNodesSetRef: { current: new Set() },
  };
  const { refs: overrideRefs, ...rest } = overrides;

  return {
    dataRef: { current: { edges: [], nodes: [] } as never },
    depthMode: false,
    fileInfoCacheRef: { current: new Map() } as never,
    graphContextSelection: createSelection([]),
    graphCursorRef: { current: 'pointer' as never },
    graphDataRef: { current: { links: [], nodes: [] } } as never,
    graphMode: '2d',
    highlightedNeighborsRef: { current: new Set() },
    highlightedNodeRef: { current: null },
    isMacPlatform: false,
    lastClickRef: { current: null },
    lastContainerContextMenuEventRef: { current: 0 },
    lastGraphContextEventRef: { current: 0 },
    refs: {
      ...baseRefs,
      ...overrideRefs,
    },
    setContextSelection: vi.fn(),
    setHighlightVersion: vi.fn(),
    setSelectedNodes: vi.fn(),
    ...rest,
  };
}

describe('graph/runtime/useGraphInteractionRuntime', () => {
  beforeEach(() => {
    interactionRuntimeHarness.applyCursorToGraphSurface.mockReset();
    interactionRuntimeHarness.createGraphContextMenuRuntime.mockReset();
    interactionRuntimeHarness.createGraphInteractionHandlers.mockReset();
    interactionRuntimeHarness.postMessage.mockReset();
    interactionRuntimeHarness.useGraphMarqueeSelectionRuntime.mockReset();
    interactionRuntimeHarness.useGraphTooltip.mockReset();
    interactionRuntimeHarness.useGraphViewportPanRuntime.mockReset();

    interactionRuntimeHarness.useGraphMarqueeSelectionRuntime.mockReturnValue(createMarqueeRuntime());
    interactionRuntimeHarness.useGraphViewportPanRuntime.mockReturnValue(createViewportPanRuntime());

    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  it('passes viewport pan and marquee runtimes the shared graph interaction options', () => {
    const interactionHandlers = createInteractionHandlers();
    const contextMenuRuntime = createContextMenuRuntime();
    const tooltipRuntime = createTooltipRuntime();

    interactionRuntimeHarness.createGraphInteractionHandlers.mockReturnValue(interactionHandlers);
    interactionRuntimeHarness.createGraphContextMenuRuntime.mockReturnValue(contextMenuRuntime);
    interactionRuntimeHarness.useGraphTooltip.mockReturnValue(tooltipRuntime);

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));

    const refs = {
      containerRef: { current: document.createElement('div') },
      fg2dRef: { current: { zoom: vi.fn(() => 1) } as never },
      rightClickFallbackTimerRef: { current: null },
      rightMouseDownRef: { current: null },
      selectedNodesSetRef: { current: new Set(['src/app.ts']) },
    };

    renderHook(() => useGraphInteractionRuntime(createRuntimeOptions({
      graphDataRef: { current: { links: [], nodes: [createNode('src/app.ts')] } } as never,
      graphMode: '2d',
      refs,
    })));

    expect(interactionRuntimeHarness.useGraphViewportPanRuntime).toHaveBeenCalledWith(expect.objectContaining({
      containerRef: refs.containerRef,
      fg2dRef: refs.fg2dRef,
      graphMode: '2d',
      rightMouseDownRef: refs.rightMouseDownRef,
      suppressContextMenu: expect.any(Function),
    }));
    expect(interactionRuntimeHarness.useGraphMarqueeSelectionRuntime).toHaveBeenCalledWith(expect.objectContaining({
      containerRef: refs.containerRef,
      fg2dRef: refs.fg2dRef,
      graphDataRef: expect.objectContaining({
        current: expect.objectContaining({
          nodes: [expect.objectContaining({ id: 'src/app.ts' })],
        }),
      }),
      graphMode: '2d',
      hoveredNodeRef: tooltipRuntime.hoveredNodeRef,
      interactionHandlers,
      selectedNodesSetRef: refs.selectedNodesSetRef,
    }));
  });

  it('applies functional context selection updates to the live selection and latest setter', () => {
    const interactionHandlers = createInteractionHandlers();
    const contextMenuRuntime = createContextMenuRuntime();
    const tooltipRuntime = createTooltipRuntime();
    const firstSetContextSelection = vi.fn();
    const secondSetContextSelection = vi.fn();

    interactionRuntimeHarness.createGraphInteractionHandlers.mockReturnValue(interactionHandlers);
    interactionRuntimeHarness.createGraphContextMenuRuntime.mockReturnValue(contextMenuRuntime);
    interactionRuntimeHarness.useGraphTooltip.mockReturnValue(tooltipRuntime);

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));

    const { rerender } = renderHook(
      ({ graphContextSelection, setContextSelection }) => useGraphInteractionRuntime(createRuntimeOptions({
        graphContextSelection,
        setContextSelection,
      })),
      {
        initialProps: {
          graphContextSelection: createSelection(['src/one.ts']),
          setContextSelection: firstSetContextSelection,
        },
      },
    );

    rerender({
      graphContextSelection: createSelection(['src/two.ts']),
      setContextSelection: secondSetContextSelection,
    });

    const contextMenuOptions = interactionRuntimeHarness.createGraphContextMenuRuntime.mock.calls.at(-1)?.[0];
    contextMenuOptions.setContextSelection((previous: GraphContextSelection) => ({
      ...previous,
      targets: [`${previous.targets[0]}:child`],
    }));

    expect(firstSetContextSelection).not.toHaveBeenCalled();
    expect(secondSetContextSelection).toHaveBeenCalledWith({
      kind: 'node',
      targets: ['src/two.ts:child'],
    });
  });

  it('builds menu action context from the latest graph mode, scale, and graph nodes', () => {
    const interactionHandlers = createInteractionHandlers();
    const contextMenuRuntime = createContextMenuRuntime();
    const tooltipRuntime = createTooltipRuntime();
    const graph = { zoom: vi.fn(() => 2) };

    interactionRuntimeHarness.createGraphInteractionHandlers.mockReturnValue(interactionHandlers);
    interactionRuntimeHarness.createGraphContextMenuRuntime.mockReturnValue(contextMenuRuntime);
    interactionRuntimeHarness.useGraphTooltip.mockReturnValue(tooltipRuntime);

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));

    const { result, rerender } = renderHook(
      ({ graphContextSelection, graphDataRef, graphMode }) => useGraphInteractionRuntime(createRuntimeOptions({
        graphContextSelection,
        graphDataRef,
        graphMode,
        refs: {
          fg2dRef: { current: graph as never },
        },
      })),
      {
        initialProps: {
          graphContextSelection: createSelection(['src/one.ts']),
          graphDataRef: { current: { links: [], nodes: [createNode('src/one.ts')] } } as never,
          graphMode: '3d' as '2d' | '3d',
        },
      },
    );

    rerender({
      graphContextSelection: createSelection(['src/two.ts']),
      graphDataRef: { current: { links: [], nodes: [createNode('src/two.ts')] } } as never,
      graphMode: '2d',
    });

    const action: GraphContextMenuAction = {
      action: 'focus',
      kind: 'builtin',
    };
    result.current.handleMenuAction({
      action,
      contextSelection: createSelection(['src/one.ts']),
    });

    expect(contextMenuRuntime.handleMenuAction).toHaveBeenCalledWith(action, expect.objectContaining({
      graphViewportScale: 2,
      mutationDirectory: 'src/one.ts',
      primaryNode: undefined,
      primaryTargetId: 'src/one.ts',
    }));
  });

  it('applies the cursor again when cursor dependencies change', () => {
    const interactionHandlers = createInteractionHandlers();
    const contextMenuRuntime = createContextMenuRuntime();
    const tooltipRuntime = createTooltipRuntime();
    const frameCallbacks: FrameRequestCallback[] = [];
    const container = document.createElement('div');

    interactionRuntimeHarness.createGraphInteractionHandlers.mockReturnValue(interactionHandlers);
    interactionRuntimeHarness.createGraphContextMenuRuntime.mockReturnValue(contextMenuRuntime);
    interactionRuntimeHarness.useGraphTooltip.mockReturnValue(tooltipRuntime);

    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    }));

    const { rerender } = renderHook(
      ({ graphCursorRef }) => useGraphInteractionRuntime(createRuntimeOptions({
        graphCursorRef,
        refs: {
          containerRef: { current: container },
        },
      })),
      {
        initialProps: {
          graphCursorRef: { current: 'pointer' as never },
        },
      },
    );

    rerender({
      graphCursorRef: { current: 'grab' as never },
    });

    expect(frameCallbacks).toHaveLength(2);

    frameCallbacks[1]?.(0);

    expect(interactionRuntimeHarness.applyCursorToGraphSurface).toHaveBeenCalledWith(container, 'grab');
  });

  it('clears the latest context menu fallback timer after the runtime changes', () => {
    const interactionHandlers = createInteractionHandlers();
    const firstContextMenuRuntime = createContextMenuRuntime();
    const secondContextMenuRuntime = createContextMenuRuntime();
    const tooltipRuntime = createTooltipRuntime();

    interactionRuntimeHarness.createGraphInteractionHandlers.mockReturnValue(interactionHandlers);
    interactionRuntimeHarness.createGraphContextMenuRuntime
      .mockReturnValueOnce(firstContextMenuRuntime)
      .mockReturnValue(secondContextMenuRuntime);
    interactionRuntimeHarness.useGraphTooltip.mockReturnValue(tooltipRuntime);

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));

    const { rerender, unmount } = renderHook(
      ({ graphMode }) => useGraphInteractionRuntime(createRuntimeOptions({ graphMode })),
      {
        initialProps: {
          graphMode: '2d' as '2d' | '3d',
        },
      },
    );

    rerender({ graphMode: '3d' });

    expect(firstContextMenuRuntime.clearRightClickFallbackTimer).toHaveBeenCalledTimes(1);
    expect(secondContextMenuRuntime.clearRightClickFallbackTimer).not.toHaveBeenCalled();

    unmount();

    expect(secondContextMenuRuntime.clearRightClickFallbackTimer).toHaveBeenCalledTimes(1);
  });

  it('clears marquee selection and tooltip tracking when the graph mouse leaves', () => {
    const interactionHandlers = createInteractionHandlers();
    const contextMenuRuntime = createContextMenuRuntime();
    const tooltipRuntime = createTooltipRuntime();
    const marqueeRuntime = createMarqueeRuntime();

    interactionRuntimeHarness.createGraphInteractionHandlers.mockReturnValue(interactionHandlers);
    interactionRuntimeHarness.createGraphContextMenuRuntime.mockReturnValue(contextMenuRuntime);
    interactionRuntimeHarness.useGraphMarqueeSelectionRuntime.mockReturnValue(marqueeRuntime);
    interactionRuntimeHarness.useGraphTooltip.mockReturnValue(tooltipRuntime);

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));

    const { result } = renderHook(() => useGraphInteractionRuntime(createRuntimeOptions()));

    result.current.handleMouseLeave();

    expect(marqueeRuntime.clearMarqueeSelection).toHaveBeenCalledTimes(1);
    expect(tooltipRuntime.handleMouseLeave).toHaveBeenCalledTimes(1);
  });

});
