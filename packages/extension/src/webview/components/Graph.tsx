/**
 * @fileoverview Graph component that renders the dependency visualization.
 * Uses react-force-graph-2d (2D canvas) or react-force-graph-3d (WebGL) based on graphMode prop.
 * @module webview/components/Graph
 */

import React, { useMemo } from 'react';
import type { IGraphData } from '../../shared/graph/types';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../shared/plugins/decorations';
import {
  useGraphAutoFit,
} from './graph/autoFit';
import { getGraphNavigator, getGraphWindow } from './graph/browser';
import { buildGraphCallbackOptions } from './graph/callbackOptions';
import { buildGraphContextMenuEntries } from './graph/contextMenu/buildEntries';
import { useGraphDebugApi } from './graph/debug';
import { buildGraphDebugOptions } from './graph/debugOptions';
import { buildGraphLayoutKey } from './graph/layoutKey';
import { detectMacPlatform } from './graph/platform';
import { buildSharedGraphProps } from './graph/rendering/surface/sharedProps';
import { buildGraphSharedPropsOptions } from './graph/sharedPropsOptions';
import { handleGraphSurface3dError } from './graph/surfaceError';
import { useGraphViewStoreState } from './graph/store';
import { getGraphSurfaceColors } from './graph/theme';
import { Viewport } from './graph/Viewport';
import { useGraphCallbacks } from './graph/rendering/useGraphCallbacks';
import { useGraphEventEffects } from './graph/runtime/use/graph/events';
import { useGraphInteractionRuntime } from './graph/runtime/use/graph/interaction';
import { useGraphRenderingRuntime } from './graph/runtime/use/graph/rendering';
import { useGraphState } from './graph/runtime/use/graph/state';
import { ThemeKind } from '../theme/useTheme';
import type { WebviewPluginHost } from '../pluginHost/manager';
import { postMessage } from '../vscodeApi';

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
  const {
    activeViewId,
    bidirectionalMode,
    dagMode,
    directionColor,
    directionMode,
    favorites,
    graphMode,
    nodeSizeMode,
    particleSize,
    particleSpeed,
    physicsPaused,
    physicsSettings,
    pluginContextMenuItems,
    setGraphMode,
    showLabels,
    timelineActive,
  } = useGraphViewStoreState();

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
  const graphLayoutKey = buildGraphLayoutKey(graphState.graphData, nodeSizeMode);
  const isMacPlatform = detectMacPlatform(getGraphNavigator());

  const interactions = useGraphInteractionRuntime({
    activeViewId,
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

  const handleEngineStop = useGraphAutoFit({
    fitView: interactions.interactionHandlers.fitView,
    graphData: graphState.graphData,
    graphMode,
    graphReady: Boolean(graphState.fg3dRef.current),
    handleEngineStop: interactions.handleEngineStop,
  });

  useGraphDebugApi(buildGraphDebugOptions({
    graphMode,
    graphState,
    interactions,
    win: getGraphWindow(),
  }));

  const callbacks = useGraphCallbacks(buildGraphCallbackOptions({ graphState, pluginHost }));

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
    graphLayoutKey,
    graphMode,
    highlightVersion: graphState.highlightVersion,
    highlightedNeighborsRef: graphState.highlightedNeighborsRef,
    highlightedNodeRef: graphState.highlightedNodeRef,
    meshesRef: graphState.meshesRef,
    nodeSizeMode,
    particleSize,
    particleSpeed,
    physicsPaused,
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
    () => buildSharedGraphProps(buildGraphSharedPropsOptions({
      containerSize: renderingRuntime.containerSize,
      dagMode,
      damping: physicsSettings.damping,
      graphData: graphState.graphData,
      handleEngineStop,
      interactions,
      timelineActive,
    })),
    [
      dagMode,
      graphState.graphData,
      handleEngineStop,
      interactions,
      physicsSettings.damping,
      renderingRuntime.containerSize,
      timelineActive,
    ],
  );

  const menuEntries = buildGraphContextMenuEntries({
    selection: graphState.contextSelection,
    timelineActive,
    favorites,
    pluginItems: pluginContextMenuItems,
  });

  const { backgroundColor, borderColor } = getGraphSurfaceColors(theme);
  const handleSurface3dError = (error: Error): void => {
    handleGraphSurface3dError({
      error,
      postGraphMessage: postMessage,
      setGraphMode,
    });
  };

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
      onSurface3dError={handleSurface3dError}
      pluginHost={pluginHost}
    />
  );
}
