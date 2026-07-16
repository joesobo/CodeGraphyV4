import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGraphInteractionRuntime } from '../../../../../src/webview/components/graph/runtime/use/interaction';
import type { FGNode } from '../../../../../src/webview/components/graph/model/build';
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

describe('graph/runtime/useGraphInteractionRuntime drag', () => {
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
