/**
 * @fileoverview Graph component that renders the dependency visualization.
 * Uses react-force-graph-2d (2D canvas) or react-force-graph-3d (WebGL) based on graphMode prop.
 * @module webview/components/Graph
 */

import React, { useMemo } from 'react';
import type {
  EdgeDecorationPayload,
  IGraphData,
  NodeDecorationPayload,
} from '../../shared/types';
import { buildGraphContextMenuEntries } from './graphContextMenu';
import { buildSharedGraphProps } from './graph/rendering/sharedProps';
import { Viewport } from './graph/Viewport';
import { useGraphCallbacks } from './graph/rendering/useGraphCallbacks';
import { useGraphEventEffects } from './graph/runtime/useGraphEventEffects';
import { useGraphInteractionRuntime } from './graph/runtime/useGraphInteractionRuntime';
import { useGraphRenderingRuntime } from './graph/runtime/useGraphRenderingRuntime';
import { useGraphState } from './graph/runtime/useGraphState';
import { ThemeKind } from '../hooks/useTheme';
import type { WebviewPluginHost } from '../pluginHost';
import { useGraphStore } from '../store';

interface GraphProps {
  data: IGraphData;
  theme?: ThemeKind;
  nodeDecorations?: Record<string, NodeDecorationPayload>;
  edgeDecorations?: Record<string, EdgeDecorationPayload>;
  pluginHost?: WebviewPluginHost;
}

export default function Graph({
  data,
  theme = 'dark',
  nodeDecorations,
  edgeDecorations,
  pluginHost,
}: GraphProps): React.ReactElement {
  const favorites = useGraphStore(state => state.favorites);
  const bidirectionalMode = useGraphStore(state => state.bidirectionalMode);
  const physicsSettings = useGraphStore(state => state.physicsSettings);
  const nodeSizeMode = useGraphStore(state => state.nodeSizeMode);
  const directionMode = useGraphStore(state => state.directionMode);
  const directionColor = useGraphStore(state => state.directionColor);
  const particleSpeed = useGraphStore(state => state.particleSpeed);
  const particleSize = useGraphStore(state => state.particleSize);
  const showLabels = useGraphStore(state => state.showLabels);
  const graphMode = useGraphStore(state => state.graphMode);
  const dagMode = useGraphStore(state => state.dagMode);
  const timelineActive = useGraphStore(state => state.timelineActive);
  const pluginContextMenuItems = useGraphStore(state => state.pluginContextMenuItems);

  const graphState = useGraphState({
    bidirectionalMode,
    data,
    directionColor,
    directionMode,
    edgeDecorations,
    favorites,
    nodeDecorations,
    nodeSizeMode,
    showLabels,
    theme,
    timelineActive,
  });

  const isMacPlatform = useMemo(
    () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform),
    [],
  );

  const interactions = useGraphInteractionRuntime({
    dataRef: graphState.dataRef,
    fileInfoCacheRef: graphState.fileInfoCacheRef,
    graphContextSelection: graphState.contextSelection,
    graphCursorRef: graphState.graphCursorRef,
    graphDataRef: graphState.graphDataRef,
    graphMode,
    highlightedNeighborsRef: graphState.highlightedNeighborsRef,
    highlightedNodeRef: graphState.highlightedNodeRef,
    isMacPlatform,
    lastClickRef: graphState.lastClickRef,
    lastContainerContextMenuEventRef: graphState.lastContainerContextMenuEventRef,
    lastGraphContextEventRef: graphState.lastGraphContextEventRef,
    pluginHost,
    refs: {
      containerRef: graphState.containerRef,
      fg2dRef: graphState.fg2dRef,
      fg3dRef: graphState.fg3dRef,
      rightClickFallbackTimerRef: graphState.rightClickFallbackTimerRef,
      rightMouseDownRef: graphState.rightMouseDownRef,
      selectedNodesSetRef: graphState.selectedNodesSetRef,
    },
    setContextSelection: graphState.setContextSelection,
    setHighlightVersion: graphState.setHighlightVersion,
    setSelectedNodes: graphState.setSelectedNodes,
  });

  const callbacks = useGraphCallbacks({
    pluginHost,
    refs: {
      directionColorRef: graphState.directionColorRef,
      directionModeRef: graphState.directionModeRef,
      edgeDecorationsRef: graphState.edgeDecorationsRef,
      highlightedNeighborsRef: graphState.highlightedNeighborsRef,
      highlightedNodeRef: graphState.highlightedNodeRef,
      meshesRef: graphState.meshesRef,
      nodeDecorationsRef: graphState.nodeDecorationsRef,
      selectedNodesSetRef: graphState.selectedNodesSetRef,
      showLabelsRef: graphState.showLabelsRef,
      spritesRef: graphState.spritesRef,
      themeRef: graphState.themeRef,
    },
    triggerImageRerender: graphState.triggerImageRerender,
  });

  const renderingRuntime = useGraphRenderingRuntime({
    containerRef: graphState.containerRef,
    dataRef: graphState.dataRef,
    fg2dRef: graphState.fg2dRef,
    fg3dRef: graphState.fg3dRef,
    getArrowColor: callbacks.getArrowColor,
    getArrowRelPos: callbacks.getArrowRelPos,
    getLinkParticles: callbacks.getLinkParticles,
    getParticleColor: callbacks.getParticleColor,
    graphDataRef: graphState.graphDataRef,
    graphMode,
    highlightVersion: graphState.highlightVersion,
    highlightedNeighborsRef: graphState.highlightedNeighborsRef,
    highlightedNodeRef: graphState.highlightedNodeRef,
    meshesRef: graphState.meshesRef,
    nodeSizeMode,
    particleSize,
    particleSpeed,
    physicsSettings,
    pluginHost,
    selectedNodesSetRef: graphState.selectedNodesSetRef,
    showLabels,
    spritesRef: graphState.spritesRef,
    theme,
    favorites,
    directionMode,
  });

  useGraphEventEffects({
    containerRef: graphState.containerRef,
    dataRef: graphState.dataRef,
    directionColorRef: graphState.directionColorRef,
    directionModeRef: graphState.directionModeRef,
    graphDataRef: graphState.graphDataRef,
    graphMode,
    interactionHandlers: interactions.interactionHandlers,
    fileInfoCacheRef: graphState.fileInfoCacheRef,
    selectedNodes: graphState.selectedNodes,
    setTooltipData: interactions.setTooltipData,
    showLabelsRef: graphState.showLabelsRef,
    themeRef: graphState.themeRef,
    tooltipPath: interactions.tooltipData.path,
  });

  const sharedProps = useMemo(
    () => buildSharedGraphProps({
      containerSize: renderingRuntime.containerSize,
      dagMode,
      graphData: graphState.graphData,
      onBackgroundClick: event => interactions.interactionHandlers.handleBackgroundClick(event),
      onBackgroundRightClick: interactions.handleBackgroundRightClick,
      onEngineStop: interactions.handleEngineStop,
      onLinkClick: (link, event) => interactions.interactionHandlers.handleLinkClick(link, event),
      onLinkRightClick: interactions.handleLinkRightClick,
      onNodeClick: (node, event) => interactions.interactionHandlers.handleNodeClick(node, event),
      onNodeHover: interactions.handleNodeHover,
      onNodeRightClick: interactions.handleNodeRightClick,
      damping: physicsSettings.damping,
      timelineActive,
    }),
    [
      dagMode,
      graphState.graphData,
      interactions.handleBackgroundRightClick,
      interactions.handleEngineStop,
      interactions.handleLinkRightClick,
      interactions.handleNodeHover,
      interactions.handleNodeRightClick,
      interactions.interactionHandlers,
      physicsSettings.damping,
      renderingRuntime.containerSize,
      timelineActive,
    ],
  );

  const menuEntries = useMemo(
    () => buildGraphContextMenuEntries({
      selection: graphState.contextSelection,
      timelineActive,
      favorites,
      pluginItems: pluginContextMenuItems,
    }),
    [favorites, graphState.contextSelection, pluginContextMenuItems, timelineActive],
  );

  const isLight = theme === 'light';
  const backgroundColor = isLight ? '#f5f5f5' : '#18181b';
  const borderColor = isLight ? '#d4d4d4' : 'rgb(63, 63, 70)';

  return (
    <Viewport
      backgroundColor={backgroundColor}
      borderColor={borderColor}
      containerRef={graphState.containerRef}
      directionMode={directionMode}
      graphMode={graphMode}
      handleContextMenu={interactions.handleContextMenu}
      handleMenuAction={interactions.handleMenuAction}
      handleMouseDownCapture={interactions.handleMouseDownCapture}
      handleMouseLeave={interactions.handleMouseLeave}
      handleMouseMoveCapture={interactions.handleMouseMoveCapture}
      handleMouseUpCapture={interactions.handleMouseUpCapture}
      menuEntries={menuEntries}
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
        onRenderFramePost: renderingRuntime.renderPluginOverlays,
        particleSize,
        particleSpeed,
        sharedProps,
      }}
      surface3dProps={{
        fg3dRef: graphState.fg3dRef,
        getArrowColor: callbacks.getArrowColor,
        getLinkColor: callbacks.getLinkColor,
        getLinkParticles: callbacks.getLinkParticles,
        getLinkWidth: callbacks.getLinkWidth,
        getParticleColor: callbacks.getParticleColor,
        nodeThreeObject: callbacks.nodeThreeObject,
        particleSize,
        particleSpeed,
        sharedProps,
      }}
      tooltipData={interactions.tooltipData}
    />
  );
}
