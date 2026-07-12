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

  it('wires tooltip and context menu adapters to the current interaction handlers', () => {
    const interactionHandlers = createInteractionHandlers();
    const contextMenuRuntime = createContextMenuRuntime();
    const tooltipRuntime = createTooltipRuntime();

    interactionRuntimeHarness.createGraphInteractionHandlers.mockReturnValue(interactionHandlers);
    interactionRuntimeHarness.createGraphContextMenuRuntime.mockReturnValue(contextMenuRuntime);
    interactionRuntimeHarness.useGraphTooltip.mockReturnValue(tooltipRuntime);

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));

    const fileInfoCacheRef = {
      current: new Map([
        ['src/stale.ts', { path: 'src/stale.ts' }],
      ]),
    };
    const setContextSelection = vi.fn();

    renderHook(() => useGraphInteractionRuntime({
      dataRef: { current: { edges: [], nodes: [] } as never },
      depthMode: false,
      fileInfoCacheRef: fileInfoCacheRef as never,
      graphContextSelection: createSelection(['src/selected.ts']),
      graphCursorRef: { current: 'pointer' as never },
      graphDataRef: { current: { links: [createLink('edge-a')], nodes: [createNode('src/selected.ts')] } } as never,
      highlightedNeighborsRef: { current: new Set(['src/selected.ts']) },
      highlightedNodeRef: { current: 'src/selected.ts' },
      isMacPlatform: false,
      lastClickRef: { current: null },
      lastContainerContextMenuEventRef: { current: 0 },
      lastGraphContextEventRef: { current: 0 },
      refs: {
        containerRef: { current: document.createElement('div') },
        fg2dRef: { current: undefined },
        rightClickFallbackTimerRef: { current: null },
        rightMouseDownRef: { current: null },
        selectedNodesSetRef: { current: new Set(['src/selected.ts']) },
      },
      setContextSelection,
      setSelectedNodes: vi.fn(),
    }));

    const tooltipOptions = interactionRuntimeHarness.useGraphTooltip.mock.calls[0]?.[0];
    tooltipOptions.interactionHandlers.sendGraphInteraction('graph:nodeHover', { node: 'src/selected.ts' });
    tooltipOptions.interactionHandlers.setGraphCursor('grab');

    expect(interactionHandlers.sendGraphInteraction).toHaveBeenCalledWith('graph:nodeHover', {
      node: 'src/selected.ts',
    });
    expect(interactionHandlers.setGraphCursor).toHaveBeenCalledWith('grab');

    const contextMenuOptions = interactionRuntimeHarness.createGraphContextMenuRuntime.mock.calls[0]?.[0];
    contextMenuOptions.clearCachedFile('src/stale.ts');
    contextMenuOptions.fitView();
    contextMenuOptions.focusNode('src/focus.ts');
    contextMenuOptions.openBackgroundContextMenu({ type: 'contextmenu' });
    contextMenuOptions.setContextSelection({ kind: 'background', targets: [] });
    contextMenuOptions.setTooltipData({ visible: true });
    contextMenuOptions.stopTooltipTracking();

    expect(fileInfoCacheRef.current.has('src/stale.ts')).toBe(false);
    expect(interactionHandlers.fitView).toHaveBeenCalledTimes(1);
    expect(interactionHandlers.focusNodeById).toHaveBeenCalledWith('src/focus.ts');
    expect(interactionHandlers.openBackgroundContextMenu).toHaveBeenCalledWith({ type: 'contextmenu' });
    expect(setContextSelection).toHaveBeenCalledWith({ kind: 'background', targets: [] });
    expect(tooltipRuntime.setTooltipData).toHaveBeenCalledWith({ visible: true });
    expect(tooltipRuntime.stopTooltipTracking).toHaveBeenCalledTimes(1);
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
      refs,
    })));

    expect(interactionRuntimeHarness.useGraphViewportPanRuntime).toHaveBeenCalledWith(expect.objectContaining({
      containerRef: refs.containerRef,
      fg2dRef: refs.fg2dRef,
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

  it('builds menu action context from the latest scale and graph nodes', () => {
    const interactionHandlers = createInteractionHandlers();
    const contextMenuRuntime = createContextMenuRuntime();
    const tooltipRuntime = createTooltipRuntime();
    const graph = { zoom: vi.fn(() => 2) };

    interactionRuntimeHarness.createGraphInteractionHandlers.mockReturnValue(interactionHandlers);
    interactionRuntimeHarness.createGraphContextMenuRuntime.mockReturnValue(contextMenuRuntime);
    interactionRuntimeHarness.useGraphTooltip.mockReturnValue(tooltipRuntime);

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));

    const { result, rerender } = renderHook(
      ({ graphContextSelection, graphDataRef }) => useGraphInteractionRuntime(createRuntimeOptions({
        graphContextSelection,
        graphDataRef,
        refs: {
          fg2dRef: { current: graph as never },
        },
      })),
      {
        initialProps: {
          graphContextSelection: createSelection(['src/one.ts']),
          graphDataRef: { current: { links: [], nodes: [createNode('src/one.ts')] } } as never,
        },
      },
    );

    rerender({
      graphContextSelection: createSelection(['src/two.ts']),
      graphDataRef: { current: { links: [], nodes: [createNode('src/two.ts')] } } as never,
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

  it('translates runtime handlers and menu actions through the composed wrappers', () => {
    const interactionHandlers = createInteractionHandlers();
    const contextMenuRuntime = createContextMenuRuntime();
    const tooltipRuntime = createTooltipRuntime();

    interactionRuntimeHarness.createGraphInteractionHandlers.mockReturnValue(interactionHandlers);
    interactionRuntimeHarness.createGraphContextMenuRuntime.mockReturnValue(contextMenuRuntime);
    interactionRuntimeHarness.useGraphTooltip.mockReturnValue(tooltipRuntime);

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));

    const { result, rerender } = renderHook(
      ({ graphContextSelection }) => useGraphInteractionRuntime({
        dataRef: { current: { edges: [], nodes: [] } as never },
        depthMode: false,
        fileInfoCacheRef: { current: new Map() } as never,
        graphContextSelection,
        graphCursorRef: { current: 'pointer' as never },
        graphDataRef: { current: { links: [], nodes: [] } } as never,
        highlightedNeighborsRef: { current: new Set() },
        highlightedNodeRef: { current: null },
        isMacPlatform: false,
        lastClickRef: { current: null },
        lastContainerContextMenuEventRef: { current: 0 },
        lastGraphContextEventRef: { current: 0 },
        refs: {
          containerRef: { current: document.createElement('div') },
          fg2dRef: { current: undefined },
          rightClickFallbackTimerRef: { current: null },
          rightMouseDownRef: { current: null },
          selectedNodesSetRef: { current: new Set() },
        },
        setContextSelection: vi.fn(),
        setSelectedNodes: vi.fn(),
      }),
      {
        initialProps: {
          graphContextSelection: createSelection(['src/one.ts']),
        },
      },
    );

    result.current.handleMouseDownCapture({
      button: 2,
      clientX: 10,
      clientY: 20,
      ctrlKey: true,
      preventDefault: vi.fn(),
    } as never);
    result.current.handleMouseMoveCapture({
      clientX: 11,
      clientY: 20,
      preventDefault: vi.fn(),
    } as never);
    result.current.handleMouseUpCapture({ button: 2, preventDefault: vi.fn() } as never);
    result.current.handleNodeRightClick(createNode('src/node.ts'), { type: 'contextmenu' } as never);
    result.current.handleBackgroundRightClick({ type: 'contextmenu' } as never);
    result.current.handleLinkRightClick(createLink('edge-a'), { type: 'contextmenu' } as never);
    result.current.handleContextMenu();

    const firstAction: GraphContextMenuAction = {
      action: 'focus',
      kind: 'builtin',
    };
    result.current.handleMenuAction({
      action: firstAction,
      contextSelection: createSelection(['src/one.ts']),
    });

    rerender({
      graphContextSelection: createSelection(['src/two.ts']),
    });

    const secondAction: GraphContextMenuAction = {
      action: 'reveal',
      kind: 'builtin',
    };
    result.current.handleMenuAction({
      action: secondAction,
      contextSelection: createSelection(['src/two.ts']),
    });
    result.current.handleEngineStop();

    expect(contextMenuRuntime.handleMouseDownCapture).toHaveBeenCalledWith({
      button: 2,
      clientX: 10,
      clientY: 20,
      ctrlKey: true,
    });
    expect(contextMenuRuntime.handleMouseMoveCapture).toHaveBeenCalledWith({
      clientX: 11,
      clientY: 20,
    });
    expect(contextMenuRuntime.handleMouseUpCapture).toHaveBeenCalledWith({ button: 2 });
    expect(interactionHandlers.openNodeContextMenu).toHaveBeenCalledWith('src/node.ts', { type: 'contextmenu' });
    expect(interactionHandlers.openBackgroundContextMenu).toHaveBeenCalledWith({ type: 'contextmenu' });
    expect(interactionHandlers.openEdgeContextMenu).toHaveBeenCalledWith(createLink('edge-a'), { type: 'contextmenu' });
    expect(contextMenuRuntime.handleContextMenu).toHaveBeenCalledTimes(1);
    expect(contextMenuRuntime.handleMenuAction).toHaveBeenNthCalledWith(1, firstAction, expect.objectContaining({
      mutationDirectory: 'src/one.ts',
      primaryTargetId: 'src/one.ts',
      selectionKind: 'node',
      targetIds: ['src/one.ts'],
    }));
    expect(contextMenuRuntime.handleMenuAction).toHaveBeenNthCalledWith(2, secondAction, expect.objectContaining({
      mutationDirectory: 'src/two.ts',
      primaryTargetId: 'src/two.ts',
      selectionKind: 'node',
      targetIds: ['src/two.ts'],
    }));
    expect(interactionRuntimeHarness.postMessage).toHaveBeenCalledWith({ type: 'PHYSICS_STABILIZED' });
  });

  it('refreshes delegated handlers when runtime dependencies change on rerender', () => {
    const firstInteractionHandlers = createInteractionHandlers();
    const secondInteractionHandlers = createInteractionHandlers();
    const firstContextMenuRuntime = createContextMenuRuntime();
    const secondContextMenuRuntime = createContextMenuRuntime();
    const tooltipRuntime = createTooltipRuntime();

    interactionRuntimeHarness.createGraphInteractionHandlers
      .mockReturnValueOnce(firstInteractionHandlers)
      .mockReturnValue(secondInteractionHandlers);
    interactionRuntimeHarness.createGraphContextMenuRuntime
      .mockReturnValueOnce(firstContextMenuRuntime)
      .mockReturnValue(secondContextMenuRuntime);
    interactionRuntimeHarness.useGraphTooltip.mockReturnValue(tooltipRuntime);

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));

    const { result, rerender } = renderHook(
      ({ depthMode }) => useGraphInteractionRuntime({
        dataRef: { current: { edges: [], nodes: [] } as never },
        depthMode,
        fileInfoCacheRef: { current: new Map() } as never,
        graphContextSelection: createSelection(['src/one.ts']),
        graphCursorRef: { current: 'pointer' as never },
        graphDataRef: { current: { links: [], nodes: [] } } as never,
        highlightedNeighborsRef: { current: new Set() },
        highlightedNodeRef: { current: null },
        isMacPlatform: false,
        lastClickRef: { current: null },
        lastContainerContextMenuEventRef: { current: 0 },
        lastGraphContextEventRef: { current: 0 },
        refs: {
          containerRef: { current: document.createElement('div') },
          fg2dRef: { current: undefined },
          rightClickFallbackTimerRef: { current: null },
          rightMouseDownRef: { current: null },
          selectedNodesSetRef: { current: new Set() },
        },
        setContextSelection: vi.fn(),
        setSelectedNodes: vi.fn(),
      }),
      {
        initialProps: { depthMode: false },
      },
    );

    rerender({ depthMode: true });

    const event = { type: 'contextmenu' } as never;
    result.current.handleBackgroundRightClick(event);
    result.current.handleNodeRightClick(createNode('src/next.ts'), event);
    result.current.handleMouseDownCapture({
      button: 2,
      clientX: 5,
      clientY: 6,
      ctrlKey: false,
      preventDefault: vi.fn(),
    } as never);
    result.current.handleContextMenu();

    expect(interactionRuntimeHarness.createGraphInteractionHandlers).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ depthMode: false }),
    );
    expect(interactionRuntimeHarness.createGraphInteractionHandlers).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ depthMode: true }),
    );
    expect(firstInteractionHandlers.openBackgroundContextMenu).not.toHaveBeenCalled();
    expect(secondInteractionHandlers.openBackgroundContextMenu).toHaveBeenCalledWith(event);
    expect(firstInteractionHandlers.openNodeContextMenu).not.toHaveBeenCalled();
    expect(secondInteractionHandlers.openNodeContextMenu).toHaveBeenCalledWith('src/next.ts', event);
    expect(firstContextMenuRuntime.handleMouseDownCapture).not.toHaveBeenCalled();
    expect(secondContextMenuRuntime.handleMouseDownCapture).toHaveBeenCalledWith({
      button: 2,
      clientX: 5,
      clientY: 6,
      ctrlKey: false,
    });
    expect(firstContextMenuRuntime.handleContextMenu).not.toHaveBeenCalled();
    expect(secondContextMenuRuntime.handleContextMenu).toHaveBeenCalledTimes(1);
  });

  it('applies the latest cursor on animation frame and cleans up on unmount', () => {
    const interactionHandlers = createInteractionHandlers();
    const contextMenuRuntime = createContextMenuRuntime();
    const tooltipRuntime = createTooltipRuntime();
    const frameCallbacks: FrameRequestCallback[] = [];

    interactionRuntimeHarness.createGraphInteractionHandlers.mockReturnValue(interactionHandlers);
    interactionRuntimeHarness.createGraphContextMenuRuntime.mockReturnValue(contextMenuRuntime);
    interactionRuntimeHarness.useGraphTooltip.mockReturnValue(tooltipRuntime);

    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return 7;
    }));

    const container = document.createElement('div');
    const { unmount } = renderHook(() => useGraphInteractionRuntime({
      dataRef: { current: { edges: [], nodes: [] } as never },
      depthMode: false,
      fileInfoCacheRef: { current: new Map() } as never,
      graphContextSelection: createSelection([]),
      graphCursorRef: { current: 'crosshair' as never },
      graphDataRef: { current: { links: [], nodes: [] } } as never,
      highlightedNeighborsRef: { current: new Set() },
      highlightedNodeRef: { current: null },
      isMacPlatform: false,
      lastClickRef: { current: null },
      lastContainerContextMenuEventRef: { current: 0 },
      lastGraphContextEventRef: { current: 0 },
      refs: {
        containerRef: { current: container },
        fg2dRef: { current: undefined },
        rightClickFallbackTimerRef: { current: null },
        rightMouseDownRef: { current: null },
        selectedNodesSetRef: { current: new Set() },
      },
      setContextSelection: vi.fn(),
      setSelectedNodes: vi.fn(),
    }));

    expect(frameCallbacks).toHaveLength(1);

    frameCallbacks[0]?.(0);

    expect(interactionRuntimeHarness.applyCursorToGraphSurface).toHaveBeenCalledWith(container, 'crosshair');

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
    expect(contextMenuRuntime.clearRightClickFallbackTimer).toHaveBeenCalledTimes(1);
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
      ({ depthMode }) => useGraphInteractionRuntime(createRuntimeOptions({ depthMode })),
      {
        initialProps: { depthMode: false },
      },
    );

    rerender({ depthMode: true });

    expect(firstContextMenuRuntime.clearRightClickFallbackTimer).toHaveBeenCalledTimes(1);
    expect(secondContextMenuRuntime.clearRightClickFallbackTimer).not.toHaveBeenCalled();

    unmount();

    expect(secondContextMenuRuntime.clearRightClickFallbackTimer).toHaveBeenCalledTimes(1);
  });

  it('skips cursor application when no container is available', () => {
    const interactionHandlers = createInteractionHandlers();
    const contextMenuRuntime = createContextMenuRuntime();
    const tooltipRuntime = createTooltipRuntime();
    const frameCallbacks: FrameRequestCallback[] = [];

    interactionRuntimeHarness.createGraphInteractionHandlers.mockReturnValue(interactionHandlers);
    interactionRuntimeHarness.createGraphContextMenuRuntime.mockReturnValue(contextMenuRuntime);
    interactionRuntimeHarness.useGraphTooltip.mockReturnValue(tooltipRuntime);

    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return 3;
    }));

    renderHook(() => useGraphInteractionRuntime({
      dataRef: { current: { edges: [], nodes: [] } as never },
      depthMode: false,
      fileInfoCacheRef: { current: new Map() } as never,
      graphContextSelection: createSelection([]),
      graphCursorRef: { current: 'pointer' as never },
      graphDataRef: { current: { links: [], nodes: [] } } as never,
      highlightedNeighborsRef: { current: new Set() },
      highlightedNodeRef: { current: null },
      isMacPlatform: false,
      lastClickRef: { current: null },
      lastContainerContextMenuEventRef: { current: 0 },
      lastGraphContextEventRef: { current: 0 },
      refs: {
        containerRef: { current: null },
        fg2dRef: { current: undefined },
        rightClickFallbackTimerRef: { current: null },
        rightMouseDownRef: { current: null },
        selectedNodesSetRef: { current: new Set() },
      },
      setContextSelection: vi.fn(),
      setSelectedNodes: vi.fn(),
    }));

    frameCallbacks[0]?.(0);

    expect(interactionRuntimeHarness.applyCursorToGraphSurface).not.toHaveBeenCalled();
  });

  it('moves selected peer nodes while dragging a selected node', () => {
    const interactionHandlers = createInteractionHandlers();
    const contextMenuRuntime = createContextMenuRuntime();
    const tooltipRuntime = createTooltipRuntime();

    interactionRuntimeHarness.createGraphInteractionHandlers.mockReturnValue(interactionHandlers);
    interactionRuntimeHarness.createGraphContextMenuRuntime.mockReturnValue(contextMenuRuntime);
    interactionRuntimeHarness.useGraphTooltip.mockReturnValue(tooltipRuntime);

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));

    const primary = { id: 'src/app.ts', x: 15, y: 12 } as FGNode;
    const sibling = { id: 'src/util.ts', x: 30, y: 40 } as FGNode;
    const { result } = renderHook(() => useGraphInteractionRuntime({
      dataRef: { current: { edges: [], nodes: [] } as never },
      depthMode: false,
      fileInfoCacheRef: { current: new Map() } as never,
      graphContextSelection: createSelection(['src/app.ts', 'src/util.ts']),
      graphCursorRef: { current: 'default' as never },
      graphDataRef: { current: { links: [], nodes: [primary, sibling] } } as never,
      highlightedNeighborsRef: { current: new Set() },
      highlightedNodeRef: { current: null },
      isMacPlatform: false,
      lastClickRef: { current: null },
      lastContainerContextMenuEventRef: { current: 0 },
      lastGraphContextEventRef: { current: 0 },
      refs: {
        containerRef: { current: document.createElement('div') },
        fg2dRef: { current: undefined },
        rightClickFallbackTimerRef: { current: null },
        rightMouseDownRef: { current: null },
        selectedNodesSetRef: { current: new Set(['src/app.ts', 'src/util.ts']) },
      },
      setContextSelection: vi.fn(),
      setSelectedNodes: vi.fn(),
    }));

    result.current.handleNodeDrag(primary, { x: 5, y: -3 });

    expect(primary.isDragging).toBe(true);
    expect(sibling).toMatchObject({
      fx: 35,
      fy: 37,
      isDragging: true,
      x: 35,
      y: 37,
    });
  });

  it('keeps the active drag group fixed and passes each node to plugin drag policies', () => {
    const interactionHandlers = createInteractionHandlers();
    const contextMenuRuntime = createContextMenuRuntime();
    const tooltipRuntime = createTooltipRuntime();
    const onNodeDragEnd = vi.fn(() => undefined);

    interactionRuntimeHarness.createGraphInteractionHandlers.mockReturnValue(interactionHandlers);
    interactionRuntimeHarness.createGraphContextMenuRuntime.mockReturnValue(contextMenuRuntime);
    interactionRuntimeHarness.useGraphTooltip.mockReturnValue(tooltipRuntime);

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));

    const primary = { id: 'src/app.ts', fx: 15, fy: 12, x: 15, y: 12 } as FGNode;
    const sibling = { id: 'src/util.ts', fx: 30, fy: 40, x: 30, y: 40 } as FGNode;
    const { result } = renderHook(() => useGraphInteractionRuntime(createRuntimeOptions({
      graphContextSelection: createSelection(['src/app.ts', 'src/util.ts']),
      graphDataRef: { current: { links: [], nodes: [primary, sibling] } } as never,
      graphViewContributions: {
        nodeDragEnd: [{
          pluginId: 'acme.graph-tools',
          contribution: {
            id: 'acme.graph-tools.drag-end',
            label: 'Drag End',
            onNodeDragEnd,
          },
        }],
      } as never,
      refs: {
        selectedNodesSetRef: { current: new Set(['src/app.ts', 'src/util.ts']) },
      },
    })));

    result.current.handleNodeDrag(primary, { x: 5, y: -3 });
    result.current.handleNodeDragEnd(primary);

    expect(onNodeDragEnd).toHaveBeenCalledWith(expect.objectContaining({
      node: primary,
      nodes: [primary, sibling],
    }));
    expect(onNodeDragEnd).toHaveBeenCalledWith(expect.objectContaining({
      node: sibling,
    }));
    expect(primary).toMatchObject({ fx: 15, fy: 12, isDragging: false });
    expect(sibling).toMatchObject({ fx: 35, fy: 37, isDragging: false });
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
