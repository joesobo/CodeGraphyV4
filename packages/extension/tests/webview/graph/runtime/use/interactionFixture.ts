import { vi } from 'vitest';
import type { GraphContextSelection } from '../../../../../src/webview/components/graph/contextMenu/contracts';
import type { FGLink, FGNode } from '../../../../../src/webview/components/graph/model/build';
import type { UseGraphInteractionRuntimeOptions } from '../../../../../src/webview/components/graph/runtime/use/interaction/contracts';

export function createInteractionHandlers() {
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

export function createContextMenuRuntime() {
  return {
    clearRightClickFallbackTimer: vi.fn(),
    handleContextMenu: vi.fn(),
    handleMenuAction: vi.fn(),
    handleMouseDownCapture: vi.fn(),
    handleMouseMoveCapture: vi.fn(),
    handleMouseUpCapture: vi.fn(),
  };
}

export function createTooltipRuntime() {
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

export function createViewportPanRuntime() {
  return {
    handleMouseDownCapture: vi.fn(),
    handleMouseMoveCapture: vi.fn(),
    handleMouseUpCapture: vi.fn(),
  };
}

export function createMarqueeRuntime() {
  return {
    clearMarqueeSelection: vi.fn(),
    handleMouseDownCapture: vi.fn(),
    handleMouseMoveCapture: vi.fn(),
    handleMouseUpCapture: vi.fn(),
    marqueeSelection: null,
  };
}

export function createNode(id: string): FGNode {
  return { id } as FGNode;
}

export function createLink(id: string): FGLink {
  return { id } as FGLink;
}

export function createSelection(targets: string[]): GraphContextSelection {
  return {
    kind: targets.length > 0 ? 'node' : 'background',
    targets,
  };
}

type RuntimeOptionsOverrides = Omit<Partial<UseGraphInteractionRuntimeOptions>, 'refs'> & {
  refs?: Partial<UseGraphInteractionRuntimeOptions['refs']>;
};

export function createRuntimeOptions(
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

