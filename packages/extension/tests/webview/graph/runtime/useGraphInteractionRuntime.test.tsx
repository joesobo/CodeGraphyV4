import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphContextMenuAction, GraphContextSelection } from '../../../../src/webview/components/graphContextMenu';
import type { FGLink, FGNode } from '../../../../src/webview/components/graphModel';
import { useGraphInteractionRuntime } from '../../../../src/webview/components/graph/runtime/useGraphInteractionRuntime';

const interactionRuntimeHarness = vi.hoisted(() => ({
  applyCursorToGraphSurface: vi.fn(),
  createGraphContextMenuRuntime: vi.fn(),
  createGraphInteractionHandlers: vi.fn(),
  postMessage: vi.fn(),
  useGraphTooltip: vi.fn(),
}));

vi.mock('../../../../src/webview/components/graph/contextMenuRuntime', () => ({
  createGraphContextMenuRuntime: interactionRuntimeHarness.createGraphContextMenuRuntime,
}));

vi.mock('../../../../src/webview/components/graph/interactions', () => ({
  createGraphInteractionHandlers: interactionRuntimeHarness.createGraphInteractionHandlers,
}));

vi.mock('../../../../src/webview/components/graphSupport', () => ({
  applyCursorToGraphSurface: interactionRuntimeHarness.applyCursorToGraphSurface,
}));

vi.mock('../../../../src/webview/components/graph/runtime/useGraphTooltip', () => ({
  useGraphTooltip: interactionRuntimeHarness.useGraphTooltip,
}));

vi.mock('../../../../src/webview/vscodeApi', () => ({
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

describe('graph/runtime/useGraphInteractionRuntime', () => {
  beforeEach(() => {
    interactionRuntimeHarness.applyCursorToGraphSurface.mockReset();
    interactionRuntimeHarness.createGraphContextMenuRuntime.mockReset();
    interactionRuntimeHarness.createGraphInteractionHandlers.mockReset();
    interactionRuntimeHarness.postMessage.mockReset();
    interactionRuntimeHarness.useGraphTooltip.mockReset();

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
      fileInfoCacheRef: fileInfoCacheRef as never,
      graphContextSelection: createSelection(['src/selected.ts']),
      graphCursorRef: { current: 'pointer' as never },
      graphDataRef: { current: { links: [createLink('edge-a')], nodes: [createNode('src/selected.ts')] } } as never,
      graphMode: '2d',
      highlightedNeighborsRef: { current: new Set(['src/selected.ts']) },
      highlightedNodeRef: { current: 'src/selected.ts' },
      isMacPlatform: false,
      lastClickRef: { current: null },
      lastContainerContextMenuEventRef: { current: 0 },
      lastGraphContextEventRef: { current: 0 },
      refs: {
        containerRef: { current: document.createElement('div') },
        fg2dRef: { current: undefined },
        fg3dRef: { current: undefined },
        rightClickFallbackTimerRef: { current: null },
        rightMouseDownRef: { current: null },
        selectedNodesSetRef: { current: new Set(['src/selected.ts']) },
      },
      setContextSelection,
      setHighlightVersion: vi.fn(),
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
        fileInfoCacheRef: { current: new Map() } as never,
        graphContextSelection,
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
          containerRef: { current: document.createElement('div') },
          fg2dRef: { current: undefined },
          fg3dRef: { current: undefined },
          rightClickFallbackTimerRef: { current: null },
          rightMouseDownRef: { current: null },
          selectedNodesSetRef: { current: new Set() },
        },
        setContextSelection: vi.fn(),
        setHighlightVersion: vi.fn(),
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
    } as never);
    result.current.handleMouseMoveCapture({
      clientX: 30,
      clientY: 40,
    } as never);
    result.current.handleMouseUpCapture({ button: 2 } as never);
    result.current.handleNodeRightClick(createNode('src/node.ts'), { type: 'contextmenu' } as never);
    result.current.handleBackgroundRightClick({ type: 'contextmenu' } as never);
    result.current.handleLinkRightClick(createLink('edge-a'), { type: 'contextmenu' } as never);
    result.current.handleContextMenu();

    const firstAction: GraphContextMenuAction = {
      action: 'focus',
      kind: 'builtin',
    };
    result.current.handleMenuAction(firstAction);

    rerender({
      graphContextSelection: createSelection(['src/two.ts']),
    });

    const secondAction: GraphContextMenuAction = {
      action: 'reveal',
      kind: 'builtin',
    };
    result.current.handleMenuAction(secondAction);
    result.current.handleEngineStop();

    expect(contextMenuRuntime.handleMouseDownCapture).toHaveBeenCalledWith({
      button: 2,
      clientX: 10,
      clientY: 20,
      ctrlKey: true,
    });
    expect(contextMenuRuntime.handleMouseMoveCapture).toHaveBeenCalledWith({
      clientX: 30,
      clientY: 40,
    });
    expect(contextMenuRuntime.handleMouseUpCapture).toHaveBeenCalledWith({ button: 2 });
    expect(interactionHandlers.openNodeContextMenu).toHaveBeenCalledWith('src/node.ts', { type: 'contextmenu' });
    expect(interactionHandlers.openBackgroundContextMenu).toHaveBeenCalledWith({ type: 'contextmenu' });
    expect(interactionHandlers.openEdgeContextMenu).toHaveBeenCalledWith(createLink('edge-a'), { type: 'contextmenu' });
    expect(contextMenuRuntime.handleContextMenu).toHaveBeenCalledTimes(1);
    expect(contextMenuRuntime.handleMenuAction).toHaveBeenNthCalledWith(1, firstAction, ['src/one.ts']);
    expect(contextMenuRuntime.handleMenuAction).toHaveBeenNthCalledWith(2, secondAction, ['src/two.ts']);
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
      ({ graphMode }) => useGraphInteractionRuntime({
        dataRef: { current: { edges: [], nodes: [] } as never },
        fileInfoCacheRef: { current: new Map() } as never,
        graphContextSelection: createSelection(['src/one.ts']),
        graphCursorRef: { current: 'pointer' as never },
        graphDataRef: { current: { links: [], nodes: [] } } as never,
        graphMode,
        highlightedNeighborsRef: { current: new Set() },
        highlightedNodeRef: { current: null },
        isMacPlatform: false,
        lastClickRef: { current: null },
        lastContainerContextMenuEventRef: { current: 0 },
        lastGraphContextEventRef: { current: 0 },
        refs: {
          containerRef: { current: document.createElement('div') },
          fg2dRef: { current: undefined },
          fg3dRef: { current: undefined },
          rightClickFallbackTimerRef: { current: null },
          rightMouseDownRef: { current: null },
          selectedNodesSetRef: { current: new Set() },
        },
        setContextSelection: vi.fn(),
        setHighlightVersion: vi.fn(),
        setSelectedNodes: vi.fn(),
      }),
      {
        initialProps: {
          graphMode: '2d' as const,
        },
      },
    );

    rerender({ graphMode: '3d' as const });

    const event = { type: 'contextmenu' } as never;
    result.current.handleBackgroundRightClick(event);
    result.current.handleNodeRightClick(createNode('src/next.ts'), event);
    result.current.handleMouseDownCapture({
      button: 2,
      clientX: 5,
      clientY: 6,
      ctrlKey: false,
    } as never);
    result.current.handleContextMenu();

    expect(interactionRuntimeHarness.createGraphInteractionHandlers).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ graphMode: '2d' }),
    );
    expect(interactionRuntimeHarness.createGraphInteractionHandlers).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ graphMode: '3d' }),
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
      fileInfoCacheRef: { current: new Map() } as never,
      graphContextSelection: createSelection([]),
      graphCursorRef: { current: 'crosshair' as never },
      graphDataRef: { current: { links: [], nodes: [] } } as never,
      graphMode: '3d',
      highlightedNeighborsRef: { current: new Set() },
      highlightedNodeRef: { current: null },
      isMacPlatform: false,
      lastClickRef: { current: null },
      lastContainerContextMenuEventRef: { current: 0 },
      lastGraphContextEventRef: { current: 0 },
      refs: {
        containerRef: { current: container },
        fg2dRef: { current: undefined },
        fg3dRef: { current: undefined },
        rightClickFallbackTimerRef: { current: null },
        rightMouseDownRef: { current: null },
        selectedNodesSetRef: { current: new Set() },
      },
      setContextSelection: vi.fn(),
      setHighlightVersion: vi.fn(),
      setSelectedNodes: vi.fn(),
    }));

    expect(frameCallbacks).toHaveLength(1);

    frameCallbacks[0]?.(0);

    expect(interactionRuntimeHarness.applyCursorToGraphSurface).toHaveBeenCalledWith(container, 'crosshair');

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
    expect(contextMenuRuntime.clearRightClickFallbackTimer).toHaveBeenCalledTimes(1);
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
        containerRef: { current: null },
        fg2dRef: { current: undefined },
        fg3dRef: { current: undefined },
        rightClickFallbackTimerRef: { current: null },
        rightMouseDownRef: { current: null },
        selectedNodesSetRef: { current: new Set() },
      },
      setContextSelection: vi.fn(),
      setHighlightVersion: vi.fn(),
      setSelectedNodes: vi.fn(),
    }));

    frameCallbacks[0]?.(0);

    expect(interactionRuntimeHarness.applyCursorToGraphSurface).not.toHaveBeenCalled();
  });
});
