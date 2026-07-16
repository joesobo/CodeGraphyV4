import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGraphInteractionRuntime } from '../../../../../src/webview/components/graph/runtime/use/interaction';
import type { GraphContextMenuAction } from '../../../../../src/webview/components/graph/contextMenu/contracts';
import {
  createContextMenuRuntime,
  createInteractionHandlers,
  createLink,
  createMarqueeRuntime,
  createNode,
  createSelection,
  createTooltipRuntime,
  createViewportPanRuntime,
} from './interactionFixture';

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

describe('graph/runtime/useGraphInteractionRuntime delegation', () => {
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

});
