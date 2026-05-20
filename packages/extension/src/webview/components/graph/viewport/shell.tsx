import { useEffect, useRef, type ReactElement } from 'react';
import type { GraphViewViewportNode } from '../../../pluginHost/api/contracts/webview';
import type { CoreGraphViewContributionSet } from '@codegraphy/core';
import type { ThemeKind } from '../../../theme/useTheme';
import type { GraphAppearance } from '../appearance/model';
import type { WebviewPluginHost } from '../../../pluginHost/manager';
import type { GraphViewStoreState } from '../view/store';
import type { UseGraphCallbacksResult } from '../rendering/useGraphCallbacks';
import type { UseGraphInteractionRuntimeResult } from '../runtime/use/interaction';
import type { UseGraphRenderingRuntimeResult } from '../runtime/use/rendering';
import type { UseGraphStateResult } from '../runtime/use/state';
import { useGraphRenderingRuntime } from '../runtime/use/rendering';
import { useGraphEventEffects } from '../runtime/use/events/effects';
import { Viewport } from './view';
import { useGraphViewportModel } from './model';
import { graphStore } from '../../../store/state';

interface GraphViewport2dControls {
  graph2ScreenCoords?(x: number, y: number): { x: number; y: number };
  screen2GraphCoords?(x: number, y: number): { x: number; y: number };
  zoom?(): number;
}

export interface GraphViewportShellProps {
  appearance?: GraphAppearance;
  callbacks: UseGraphCallbacksResult;
  graphDataLayoutKey: string;
  graphState: UseGraphStateResult;
  graphViewContributions?: CoreGraphViewContributionSet;
  handleEngineStop(this: void): void;
  interactions: UseGraphInteractionRuntimeResult;
  pluginHost?: WebviewPluginHost;
  theme: ThemeKind;
  viewState: GraphViewStoreState;
}

function buildRenderingRuntimeOptions({
  appearance,
  callbacks,
  graphDataLayoutKey,
  graphState,
  graphViewContributions,
  pluginHost,
  theme,
  viewState,
}: Pick<GraphViewportShellProps, 'appearance' | 'callbacks' | 'graphDataLayoutKey' | 'graphState' | 'graphViewContributions' | 'pluginHost' | 'theme' | 'viewState'>) {
  return {
    appearance,
    containerRef: graphState.containerRef,
    dataRef: graphState.dataRef,
    fg2dRef: graphState.fg2dRef,
    fg3dRef: graphState.fg3dRef,
    getArrowColor: callbacks.getArrowColor,
    getArrowRelPos: callbacks.getArrowRelPos,
    getLinkParticles: callbacks.getLinkParticles,
    getParticleColor: callbacks.getParticleColor,
    graphDataRef: graphState.graphDataRef,
    graphViewContributions,
    graphDataLayoutKey,
    graphMode: viewState.graphMode,
    highlightVersion: graphState.highlightVersion,
    highlightedNeighborsRef: graphState.highlightedNeighborsRef,
    highlightedNodeRef: graphState.highlightedNodeRef,
    meshesRef: graphState.meshesRef,
    nodeSizeMode: viewState.nodeSizeMode,
    particleSize: viewState.particleSize,
    particleSpeed: viewState.particleSpeed,
    physicsPaused: viewState.physicsPaused,
    physicsSettings: viewState.physicsSettings,
    pluginHost,
    selectedNodesSetRef: graphState.selectedNodesSetRef,
    showLabels: viewState.showLabels,
    spritesRef: graphState.spritesRef,
    theme,
    timelineActive: viewState.timelineActive,
    favorites: viewState.favorites,
    directionMode: viewState.directionMode,
  };
}

function useGraphViewportModelOptions({
  appearance,
  graphState,
  graphViewContributions,
  interactions,
  handleEngineStop,
  viewportRuntime,
  viewState,
}: {
  appearance?: GraphAppearance;
  graphState: UseGraphStateResult;
  graphViewContributions?: CoreGraphViewContributionSet;
  interactions: UseGraphInteractionRuntimeResult;
  handleEngineStop(this: void): void;
  viewportRuntime: Pick<UseGraphRenderingRuntimeResult, 'containerSize' | 'renderPluginOverlays'>;
  viewState: GraphViewStoreState;
}) {
  return useGraphViewportModel({
    graphState: {
      contextSelection: graphState.contextSelection,
      graphData: graphState.graphData,
    },
    graphViewContributions,
    handleEngineStop,
    appearance,
    interactions,
    viewportRuntime,
    viewState,
  });
}

function shouldPublishGraphViewportScale(
  previous: number | null,
  next: number,
): boolean {
  return previous === null || Math.abs(previous - next) >= 0.01;
}

function readViewportBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readViewportNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readViewportOwnerSectionId(value: unknown): string | null | undefined {
  return typeof value === 'string' || value === null ? value : undefined;
}

function toGraphViewViewportNodes(nodes: UseGraphStateResult['graphData']['nodes']): GraphViewViewportNode[] {
  return nodes.map(node => ({
    fx: node.fx,
    fy: node.fy,
    fz: node.fz,
    id: node.id,
    isCollapsedGraphSection: readViewportBoolean(node.isCollapsedGraphSection),
    isDragging: node.isDragging,
    isGraphSection: readViewportBoolean(node.isGraphSection),
    isPinned: node.isPinned,
    ownerSectionId: readViewportOwnerSectionId(node.ownerSectionId),
    sectionHeight: readViewportNumber(node.sectionHeight),
    sectionWidth: readViewportNumber(node.sectionWidth),
    size: node.size,
    vx: node.vx,
    vy: node.vy,
    vz: node.vz,
    x: node.x,
    y: node.y,
    z: node.z,
  }));
}

export function GraphViewportShell({
  appearance,
  callbacks,
  graphDataLayoutKey,
  graphState,
  graphViewContributions,
  handleEngineStop,
  interactions,
  pluginHost,
  theme,
  viewState,
}: GraphViewportShellProps): ReactElement {
  const lastPublishedViewportScaleRef = useRef<number | null>(null);
  const viewportRuntime = useGraphRenderingRuntime(buildRenderingRuntimeOptions({
    appearance,
    callbacks,
    graphDataLayoutKey,
    graphState,
    graphViewContributions,
    pluginHost,
    theme,
    viewState,
  }));

  useGraphEventEffects({
    containerRef: graphState.containerRef,
    dataRef: graphState.dataRef,
    directionColorRef: graphState.directionColorRef,
    directionModeRef: graphState.directionModeRef,
    graphDataRef: graphState.graphDataRef,
    graphMode: viewState.graphMode,
    interactionHandlers: interactions.interactionHandlers,
    fileInfoCacheRef: graphState.fileInfoCacheRef,
    selectedNodes: graphState.selectedNodes,
    setTooltipData: interactions.setTooltipData,
    showLabelsRef: graphState.showLabelsRef,
    themeRef: graphState.themeRef,
    tooltipPath: interactions.tooltipData.path,
  });

  const viewportModel = useGraphViewportModelOptions({
    appearance,
    graphState,
    graphViewContributions,
    handleEngineStop,
    interactions,
    viewportRuntime,
    viewState,
  });

  const publishGraphViewportScale = (globalScale: number): void => {
    if (viewState.graphMode !== '2d' || !Number.isFinite(globalScale) || globalScale <= 0) {
      return;
    }

    if (!shouldPublishGraphViewportScale(lastPublishedViewportScaleRef.current, globalScale)) {
      return;
    }

    lastPublishedViewportScaleRef.current = globalScale;
    graphStore.getState().setGraphViewportScale(globalScale);
  };

  const publishGraphViewViewportState = (globalScale: number): void => {
    if (!pluginHost) {
      return;
    }

    const graph = graphState.fg2dRef.current as GraphViewport2dControls | undefined;
    pluginHost.setGraphViewViewportState({
      graphMode: viewState.graphMode,
      graphToScreen: (x, y) => graph?.graph2ScreenCoords?.(x, y) ?? { x, y },
      nodes: toGraphViewViewportNodes(graphState.graphDataRef.current.nodes),
      screenToGraph: (x, y) => graph?.screen2GraphCoords?.(x, y) ?? { x, y },
      timelineActive: viewState.timelineActive,
      zoom: graph?.zoom?.() ?? globalScale,
    });
  };

  useEffect(() => {
    return () => {
      pluginHost?.setGraphViewViewportState(null);
    };
  }, [pluginHost]);

  return (
    <Viewport
      canvasBackgroundColor={viewportModel.canvasBackgroundColor}
      containerBackgroundColor={viewportModel.containerBackgroundColor}
      borderColor={viewportModel.borderColor}
      containerRef={graphState.containerRef}
      directionMode={viewState.directionMode}
      graphMode={viewState.graphMode}
      handleContextMenu={interactions.handleContextMenu}
      handleMenuAction={interactions.handleMenuAction}
      handleMouseDownCapture={interactions.handleMouseDownCapture}
      handleMouseLeave={interactions.handleMouseLeave}
      handleMouseMoveCapture={interactions.handleMouseMoveCapture}
      handleMouseUpCapture={interactions.handleMouseUpCapture}
      menuEntries={viewportModel.menuEntries}
      marqueeSelection={interactions.marqueeSelection}
      surface2dProps={{
        fg2dRef: graphState.fg2dRef,
        getArrowColor: callbacks.getArrowColor,
        getArrowRelPos: callbacks.getArrowRelPos,
        getLinkColor: callbacks.getLinkColor,
        getLinkParticles: callbacks.getLinkParticles,
        getLinkWidth: callbacks.getLinkWidth,
        getParticleColor: callbacks.getParticleColor,
        linkCanvasObject: callbacks.linkCanvasObject,
        nodeCanvasObject: callbacks.nodeCanvasObject,
        nodePointerAreaPaint: callbacks.nodePointerAreaPaint,
        onRenderFramePost: (ctx, globalScale) => {
          publishGraphViewportScale(globalScale);
          publishGraphViewViewportState(globalScale);
          viewportRuntime.renderPluginOverlays(ctx, globalScale);
        },
        particleSize: viewState.particleSize,
        particleSpeed: viewState.particleSpeed,
        sharedProps: viewportModel.sharedProps,
      }}
      surface3dProps={{
        fg3dRef: graphState.fg3dRef,
        getArrowColor: callbacks.getArrowColor,
        getLinkColor: callbacks.getLinkColor,
        getLinkParticles: callbacks.getLinkParticles,
        getLinkWidth: callbacks.getLinkWidth,
        getParticleColor: callbacks.getParticleColor,
        nodeThreeObject: callbacks.nodeThreeObject,
        particleSize: viewState.particleSize,
        particleSpeed: viewState.particleSpeed,
        sharedProps: viewportModel.sharedProps,
      }}
      tooltipData={interactions.tooltipData}
      onSurface3dError={viewportModel.onSurface3dError}
      pluginHost={pluginHost}
    />
  );
}
