import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { IPhysicsSettings } from '../../../../src/shared/settings/physics';
import type { GraphViewStoreState } from '../../../../src/webview/components/graph/view/store';
import type { UseGraphInteractionRuntimeResult } from '../../../../src/webview/components/graph/runtime/use/interaction';
import type { GraphRuntime } from '../../../../src/webview/components/graph/runtime/use/state';
import { GraphViewportShell } from '../../../../src/webview/components/graph/viewport/shell';
import { graphStore } from '../../../../src/webview/store/state';

const shellHarness = vi.hoisted(() => ({
  postMessage: vi.fn(),
  useGraphEventEffects: vi.fn(),
  useGraphRenderingRuntime: vi.fn(),
  useGraphViewportModel: vi.fn(),
  viewport: vi.fn((_props: Record<string, unknown>) => <div data-testid="graph-viewport" />),
}));

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: shellHarness.postMessage,
}));

vi.mock('../../../../src/webview/components/graph/runtime/use/rendering', () => ({
  useGraphRenderingRuntime: shellHarness.useGraphRenderingRuntime,
}));

vi.mock('../../../../src/webview/components/graph/runtime/use/events/effects', () => ({
  useGraphEventEffects: shellHarness.useGraphEventEffects,
}));

vi.mock('../../../../src/webview/components/graph/viewport/model', () => ({
  useGraphViewportModel: shellHarness.useGraphViewportModel,
}));

vi.mock('../../../../src/webview/components/graph/viewport/view', () => ({
  Viewport: (props: Record<string, unknown>) => {
    shellHarness.viewport(props);
    return <div data-testid="graph-viewport" />;
  },
}));

export function createGraphData(): GraphRuntime['renderer']['graphData'] {
  return {
    nodes: [
      {
        baseOpacity: 1,
        borderColor: '#1f2937',
        borderWidth: 1,
        color: '#93C5FD',
        customRuntimeState: { owner: 'plugin-a' },
        id: 'src/app.ts',
        isFavorite: false,
        isPinned: false,
        label: 'app.ts',
        size: 12,
      },
      {
        baseOpacity: 1,
        borderColor: '#1f2937',
        borderWidth: 1,
        color: '#67E8F9',
        id: 'src/lib.ts',
        isFavorite: false,
        isPinned: false,
        label: 'lib.ts',
        size: 12,
      },
    ],
    links: [{
      bidirectional: false,
      id: 'src/app.ts->src/lib.ts',
      from: 'src/app.ts',
      kind: 'import',
      source: 'src/app.ts',
      sourceNode: undefined,
      sources: [],
      target: 'src/lib.ts',
      targetNode: undefined,
      to: 'src/lib.ts',
      visible: true,
    }],
  };
}

export function createGraphState(graphData: GraphRuntime['renderer']['graphData']): GraphRuntime {
  const dataRefCurrent: IGraphData = {
    nodes: graphData.nodes.map(node => ({ id: node.id, label: node.label, color: node.color })),
    edges: graphData.links.map(link => ({
      from: link.from,
      id: link.id,
      kind: 'import',
      sources: [],
      to: link.to,
    })),
  };
  const graphDataRef = {
    current: {
      links: graphData.links.map(link => ({ ...link })),
      nodes: graphData.nodes.map(node => ({ ...node })),
    },
  };

  return {
    context: {
      selection: { kind: 'background', targets: [] },
      setSelection: vi.fn(),
      lastContainerContextMenuEventRef: { current: 0 },
      lastGraphContextEventRef: { current: 0 },
      rightClickFallbackTimerRef: { current: null },
      rightMouseDownRef: { current: null },
    },
    dataRef: { current: dataRefCurrent },
    directionModeRef: { current: 'arrows' },
    graphCursorRef: { current: 'default' },
    highlightVersion: 0,
    highlightedNeighborsRef: { current: new Set() },
    highlightedNodeRef: { current: null },
    lastClickRef: { current: null },
    renderer: {
      containerRef: { current: null },
      fg2dRef: { current: undefined },
      graphData,
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
    edgeDecorationsRef: { current: {} },
    graphAppearanceRef: { current: { labelForeground: '#f8fafc' } },
    nodeDecorationsRef: { current: {} },
    setHighlightVersion: vi.fn(),
    showLabelsRef: { current: true },
    themeRef: { current: 'dark' },
  } as unknown as GraphRuntime;
}

export function createInteractions(): UseGraphInteractionRuntimeResult {
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
      zoomGraphView: vi.fn(),
      setSelection: vi.fn(),
      requestNodeOpenById: vi.fn(),
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
    contextMenuRuntime: {} as never,
    hoveredNodeRef: { current: null },
    stopTooltipTracking: vi.fn(),
    tooltipTimeoutRef: { current: null },
  } as unknown as UseGraphInteractionRuntimeResult;
}

export function createCallbacks() {
  return {
    getArrowColor: vi.fn(),
    getLinkColor: vi.fn(),
    getLinkOpacity: vi.fn(() => 0.3),
    getLinkParticles: vi.fn(),
    getLinkWidth: vi.fn(),
    getNodeStyle: vi.fn(() => ({
      borderColor: '#000', borderWidth: 1, cornerRadius: 0, fillColor: '#fff',
      fillOpacity: 1, height: 16, opacity: 1, shape: 'circle' as const, width: 16,
    })),
    getParticleColor: vi.fn(),
    getStyleRevision: vi.fn(() => 1),
    nodeLabelCanvasObject: vi.fn(),
  };
}

export function createViewState(): Pick<
  GraphViewStoreState,
  'bidirectionalMode' | 'depthMode' | 'directionMode' | 'favorites' | 'nodeSizeMode' | 'particleSize' | 'particleSpeed' | 'physicsSettings' | 'pluginContextMenuItems' | 'showFps' | 'showLabels' | 'showMinimap'
> {
  const physicsSettings: IPhysicsSettings = {
    centerForce: 0.1,
    damping: 0.42,
    linkDistance: 120,
    linkForce: 0.4,
    repelForce: 500,
  };
  return {
    bidirectionalMode: 'separate',
    depthMode: false,
    directionMode: 'arrows',
    favorites: new Set(['src/app.ts']),
    nodeSizeMode: 'connections',
    particleSize: 3,
    particleSpeed: 0.2,
    physicsSettings,
    pluginContextMenuItems: [],
    showFps: false,
    showLabels: true,
    showMinimap: true,
  };
}

export function resetShellHarness(): void {
  shellHarness.postMessage.mockReset();
  shellHarness.useGraphEventEffects.mockReset();
  shellHarness.useGraphRenderingRuntime.mockReset();
  shellHarness.useGraphViewportModel.mockReset();
  shellHarness.viewport.mockReset();
  graphStore.getState().setGraphViewportScale(null);
  shellHarness.useGraphRenderingRuntime.mockReturnValue({
    containerSize: { height: 320, width: 480 },
    renderPluginOverlays: vi.fn(),
  });
  shellHarness.useGraphViewportModel.mockReturnValue({
    canvasBackgroundColor: 'transparent',
    containerBackgroundColor: 'var(--cg-popover-translucent)',
    menuEntries: [{ id: 'menu', kind: 'action', label: 'Menu', action: { type: 'noop' } }],
    sharedProps: {
      graphData: { nodes: [], links: [] },
      onBackgroundClick: vi.fn(), onBackgroundRightClick: vi.fn(), onEngineStop: vi.fn(),
      onLinkClick: vi.fn(), onLinkRightClick: vi.fn(), onNodeClick: vi.fn(),
      onNodeDrag: vi.fn(), onNodeDragEnd: vi.fn(), onNodeHover: vi.fn(),
      onNodeRightClick: vi.fn(), width: 480,
    },
  });
}

export function renderGraphViewportShell(options: {
  callbacks?: ReturnType<typeof createCallbacks>;
  graphState?: GraphRuntime;
  handleEngineStop?: ReturnType<typeof vi.fn>;
  interactions?: UseGraphInteractionRuntimeResult;
  pluginHost?: unknown;
  viewState?: ReturnType<typeof createViewState>;
} = {}) {
  const graphState = options.graphState ?? createGraphState(createGraphData());
  const props = {
    callbacks: options.callbacks ?? createCallbacks(),
    graphDataLayoutKey: 'connections::',
    graphState,
    handleEngineStop: options.handleEngineStop ?? vi.fn(),
    interactions: options.interactions ?? createInteractions(),
    pluginHost: options.pluginHost as never,
    theme: 'light' as const,
    viewState: options.viewState ?? createViewState(),
  };
  const rendered = render(<GraphViewportShell {...props} />);
  return {
    ...rendered,
    graphState,
    props,
    rerenderShell(overrides: Partial<typeof props>): void {
      rendered.rerender(<GraphViewportShell {...props} {...overrides} />);
    },
  };
}

export function latestFrameCallback(): (ctx: CanvasRenderingContext2D, globalScale: number) => void {
  const viewportProps = shellHarness.viewport.mock.calls.at(-1)?.[0] as {
    surface2dProps: { onRenderFramePost(ctx: CanvasRenderingContext2D, globalScale: number): void };
  };
  return viewportProps.surface2dProps.onRenderFramePost;
}

export function getShellHarness(): typeof shellHarness {
  return shellHarness;
}

export function readGraphViewportScale(): number | null {
  return graphStore.getState().graphViewportScale;
}
