import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGraphInteractionRuntime } from '../../../../../src/webview/components/graph/runtime/use/interaction';
import {
  createContextMenuRuntime,
  createInteractionHandlers,
  createMarqueeRuntime,
  createRuntimeOptions,
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

describe('graph/runtime/useGraphInteractionRuntime lifecycle', () => {
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

});
