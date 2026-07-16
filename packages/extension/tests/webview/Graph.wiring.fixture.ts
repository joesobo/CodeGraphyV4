import { act } from '@testing-library/react';
import { vi } from 'vitest';
import type { IGraphData } from '../../src/shared/graph/contracts';
import type { GraphRuntime } from '../../src/webview/components/graph/runtime/use/state';
import { graphStore } from '../../src/webview/store/state';

export const baseData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
    { id: 'src/lib.ts', label: 'lib.ts', color: '#67E8F9' },
  ],
  edges: [{ id: 'src/app.ts->src/lib.ts', from: 'src/app.ts', to: 'src/lib.ts', kind: 'import', sources: [] }],
};

export function createGraphState(graphData: IGraphData = baseData): GraphRuntime {
  const graphDataRuntime = {
    nodes: graphData.nodes.map(node => ({ ...node })),
    links: graphData.edges.map(edge => ({ ...edge })),
  };
  const graphDataRef = {
    current: {
      nodes: graphData.nodes.map(node => ({ ...node })),
      links: graphData.edges.map(edge => ({ ...edge })),
    },
  };
  const lastContainerContextMenuEventRef = { current: 0 };
  const lastGraphContextEventRef = { current: 0 };
  const rightClickFallbackTimerRef = { current: null };
  const rightMouseDownRef = { current: null };

  return {
    context: {
      selection: { kind: 'background', targets: [] },
      setSelection: vi.fn(),
      lastContainerContextMenuEventRef,
      lastGraphContextEventRef,
      rightClickFallbackTimerRef,
      rightMouseDownRef,
    },
    dataRef: { current: graphData },
    directionModeRef: { current: 'arrows' },
    edgeDecorationsRef: { current: {} },
    graphCursorRef: { current: 'default' },
    graphAppearanceRef: { current: {} },
    highlightedNeighborsRef: { current: new Set() },
    highlightedNodeRef: { current: null },
    lastClickRef: { current: 0 },
    nodeDecorationsRef: { current: {} },
    renderer: {
      containerRef: { current: null },
      fg2dRef: { current: undefined },
      graphData: graphDataRuntime,
      graphDataRef,
    },
    renderCaches: {
      fileInfoCacheRef: { current: new Map() },
      invalidateImages: vi.fn(),
    },
    selection: {
      selectedNodeIds: [],
      selectedNodeIdsRef: { current: new Set() },
      setSelectedNodeIds: vi.fn(),
    },
    showLabelsRef: { current: true },
    themeRef: { current: 'dark' },
  } as unknown as GraphRuntime;
}

export function createInteractionRuntime() {
  return {
    handleBackgroundRightClick: vi.fn(),
    handleContextMenu: vi.fn(),
    handleEngineStop: vi.fn(),
    handleLinkRightClick: vi.fn(),
    handleMenuAction: vi.fn(),
    handleMouseDownCapture: vi.fn(),
    handleMouseLeave: vi.fn(),
    handleMouseMoveCapture: vi.fn(),
    handleMouseUpCapture: vi.fn(),
    handleNodeHover: vi.fn(),
    handleNodeRightClick: vi.fn(),
    interactionHandlers: {
      fitView: vi.fn(),
      handleBackgroundClick: vi.fn(),
      handleLinkClick: vi.fn(),
      handleNodeClick: vi.fn(),
    },
    setTooltipData: vi.fn(),
    tooltipData: {
      visible: false,
      nodeRect: { x: 0, y: 0, radius: 0 },
      path: '',
      info: null,
      pluginActions: [],
      pluginSections: [],
    },
  };
}

export function createCallbacks() {
  return {
    getArrowColor: vi.fn(),
    getLinkColor: vi.fn(),
    getLinkOpacity: vi.fn(() => 0.3),
    getLinkParticles: vi.fn(),
    getLinkWidth: vi.fn(),
    getParticleColor: vi.fn(),
  };
}

function resetStore(overrides: Record<string, unknown> = {}): void {
  graphStore.setState({
    bidirectionalMode: 'separate',
    directionColor: '#22c55e',
    directionMode: 'arrows',
    favorites: new Set<string>(),
    nodeSizeMode: 'connections',
    particleSize: 2,
    particleSpeed: 0.1,
    physicsSettings: {
      repelForce: 50,
      centerForce: 0.1,
      linkDistance: 50,
      linkForce: 0.2,
      damping: 0.7,
    },
    pluginContextMenuItems: [],
    showLabels: true,
    ...overrides,
  });
}

export function setStoreState(overrides: Record<string, unknown> = {}): void {
  act(() => resetStore(overrides));
}
