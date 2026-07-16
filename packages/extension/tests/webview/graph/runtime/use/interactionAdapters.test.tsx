import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGraphInteractionRuntime } from '../../../../../src/webview/components/graph/runtime/use/interaction';
import {
  createContextMenuRuntime,
  createInteractionHandlers,
  createLink,
  createMarqueeRuntime,
  createNode,
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

describe('graph/runtime/useGraphInteractionRuntime adapters', () => {
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

});
