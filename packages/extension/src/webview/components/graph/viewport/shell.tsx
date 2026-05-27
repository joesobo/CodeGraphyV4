import { useRef, type ReactElement } from 'react';
import type { ThemeKind } from '../../../theme/useTheme';
import type { LegendIconImport } from '../../../../shared/protocol/webviewToExtension';
import {
  getGraphLayoutPinCoordinate,
  type GraphLayoutSection,
  type GraphLayoutSectionUpdate,
} from '../../../../shared/settings/graphLayout';
import type { GraphAppearance } from '../appearance/model';
import type { WebviewPluginHost } from '../../../pluginHost/manager';
import type { GraphViewStoreState } from '../view/store';
import type { UseGraphCallbacksResult } from '../rendering/useGraphCallbacks';
import type { UseGraphInteractionRuntimeResult } from '../runtime/use/interaction';
import type { UseGraphRenderingRuntimeResult } from '../runtime/use/rendering';
import type { UseGraphStateResult } from '../runtime/use/state';
import type { FGNode } from '../model/build';
import type { SectionFrameNodePosition } from '../sectionFrames/model';
import { useGraphRenderingRuntime } from '../runtime/use/rendering';
import { useGraphEventEffects } from '../runtime/use/events/effects';
import { postNodeDragEndMessages } from '../runtime/use/interaction/nodeDrag';
import { Viewport } from './view';
import { useGraphViewportModel } from './model';
import { postMessage } from '../../../vscodeApi';
import { graphStore } from '../../../store/state';

export interface GraphViewportShellProps {
  appearance?: GraphAppearance;
  callbacks: UseGraphCallbacksResult;
  graphLayoutKey: string;
  graphState: UseGraphStateResult;
  handleEngineStop(this: void): void;
  interactions: UseGraphInteractionRuntimeResult;
  pluginHost?: WebviewPluginHost;
  theme: ThemeKind;
  viewState: GraphViewStoreState;
}

function buildRenderingRuntimeOptions({
  appearance,
  callbacks,
  graphLayoutKey,
  graphState,
  pluginHost,
  theme,
  viewState,
}: Pick<GraphViewportShellProps, 'appearance' | 'callbacks' | 'graphLayoutKey' | 'graphState' | 'pluginHost' | 'theme' | 'viewState'>) {
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
    graphLayout: viewState.graphLayout,
    graphLayoutKey,
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
    favorites: viewState.favorites,
    directionMode: viewState.directionMode,
  };
}

function useGraphViewportModelOptions({
  appearance,
  graphState,
  interactions,
  handleEngineStop,
  viewportRuntime,
  viewState,
}: {
  appearance?: GraphAppearance;
  graphState: UseGraphStateResult;
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
    handleEngineStop,
    appearance,
    interactions,
    viewportRuntime,
    viewState,
  });
}

function getPinnedSectionIds(
  sections: readonly GraphLayoutSection[],
  pinnedNodes: GraphViewStoreState['graphLayout']['pinnedNodes'],
): Set<string> {
  const pinnedSectionIds = new Set<string>();
  for (const section of sections) {
    if (getGraphLayoutPinCoordinate(pinnedNodes[section.id], '2d')) {
      pinnedSectionIds.add(section.id);
    }
  }

  return pinnedSectionIds;
}

function getSectionFrameNodePositions(
  nodes: readonly FGNode[],
): Map<string, SectionFrameNodePosition> {
  const positions = new Map<string, SectionFrameNodePosition>();

  for (const node of nodes) {
    if (!node.isGraphSection || node.isCollapsedGraphSection) {
      continue;
    }

    positions.set(node.id, node);
  }

  return positions;
}

function shouldPublishGraphViewportScale(
  previous: number | null,
  next: number,
): boolean {
  return previous === null || Math.abs(previous - next) >= 0.01;
}

export interface GraphViewportScalePublisher {
  graphMode: GraphViewStoreState['graphMode'];
  previousScale: number | null;
  setPreviousScale(scale: number): void;
  setGraphViewportScale(scale: number): void;
}

export function publishGraphViewportScale(
  globalScale: number,
  publisher: GraphViewportScalePublisher,
): void {
  if (publisher.graphMode !== '2d' || !Number.isFinite(globalScale) || globalScale <= 0) {
    return;
  }

  if (!shouldPublishGraphViewportScale(publisher.previousScale, globalScale)) {
    return;
  }

  publisher.setPreviousScale(globalScale);
  publisher.setGraphViewportScale(globalScale);
}

export function GraphViewportShell({
  appearance,
  callbacks,
  graphLayoutKey,
  graphState,
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
    graphLayoutKey,
    graphState,
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
    handleEngineStop,
    interactions,
    viewportRuntime,
    viewState,
  });

  function handleUpdateSection(
    sectionId: string,
    updates: GraphLayoutSectionUpdate,
    iconImports?: LegendIconImport[],
  ): void {
    postMessage({
      type: 'UPDATE_GRAPH_LAYOUT_SECTION',
      payload: iconImports?.length
        ? { sectionId, updates, iconImports }
        : { sectionId, updates },
    });
  }

  function handleSectionDragEnd(sectionId: string): void {
    const node = graphState.graphDataRef.current.nodes.find(candidate => candidate.id === sectionId);
    if (!node) {
      return;
    }

    postNodeDragEndMessages(
      node,
      viewState.graphLayout,
      viewState.graphMode,
      viewState.timelineActive,
      graphState.graphDataRef.current.nodes,
    );
  }

  const sectionFrames = viewState.graphMode === '2d' && !viewState.timelineActive
    ? Object.values(viewState.graphLayout.sections)
    : [];
  const pinnedSectionIds = getPinnedSectionIds(sectionFrames, viewState.graphLayout.pinnedNodes);
  const sectionFrameNodePositions = getSectionFrameNodePositions(graphState.graphData.nodes);
  const publishCurrentGraphViewportScale = (globalScale: number): void => publishGraphViewportScale(globalScale, {
    graphMode: viewState.graphMode,
    previousScale: lastPublishedViewportScaleRef.current,
    setPreviousScale: scale => {
      lastPublishedViewportScaleRef.current = scale;
    },
    setGraphViewportScale: scale => graphStore.getState().setGraphViewportScale(scale),
  });

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
      sectionFrameGraph={graphState.fg2dRef.current}
      sectionFrameOwnership={viewState.graphLayout.ownership}
      sectionNodePositions={sectionFrameNodePositions}
      pinnedSectionIds={pinnedSectionIds}
      sectionFrames={sectionFrames}
      onOpenSectionContextMenu={(sectionId, event) => {
        interactions.handleNodeContextMenuById(sectionId, event.nativeEvent);
      }}
      onSectionDragEnd={handleSectionDragEnd}
      onUpdateSection={handleUpdateSection}
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
          publishCurrentGraphViewportScale(globalScale);
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
