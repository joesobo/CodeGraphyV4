/**
 * @fileoverview Graph component that renders the dependency visualization.
 * Uses react-force-graph-2d (2D canvas) or react-force-graph-3d (WebGL) based on graphMode prop.
 * @module webview/components/Graph
 */

import React from 'react';
import type { IGraphData } from '../../shared/graph/types';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../shared/plugins/decorations';
import {
  useGraphAutoFit,
} from './graph/autoFit';
import { getGraphNavigator, getGraphWindow } from './graph/browser';
import { buildGraphCallbackOptions } from './graph/callbackOptions';
import { useGraphDebugApi } from './graph/useDebugApi';
import { buildGraphDebugOptions } from './graph/debugOptions';
import { buildGraphLayoutKey } from './graph/layoutKey';
import { detectMacPlatform } from './graph/platform';
import { useGraphViewStoreState } from './graph/store';
import { useGraphCallbacks } from './graph/rendering/useGraphCallbacks';
import { useGraphInteractionRuntime } from './graph/runtime/use/graph/interaction';
import { useGraphState } from './graph/runtime/use/graph/state';
import { isPhysicsGraphReady, selectActivePhysicsGraph } from './graph/runtime/physicsLifecycle';
import { GraphViewportShell } from './graph/viewport/shell';
import { ThemeKind } from '../theme/useTheme';
import type { WebviewPluginHost } from '../pluginHost/manager';

interface GraphProps {
  data: IGraphData;
  theme?: ThemeKind;
  nodeDecorations?: Record<string, NodeDecorationPayload>;
  edgeDecorations?: Record<string, EdgeDecorationPayload>;
  onAddFilterRequested?: (pattern: string) => void;
  onAddLegendRequested?: (rule: { pattern: string; color: string; target: 'node' | 'edge' }) => void;
  pluginHost?: WebviewPluginHost;
}

export default function Graph({
  data,
  theme = 'dark',
  nodeDecorations,
  edgeDecorations,
  onAddFilterRequested = () => {},
  onAddLegendRequested = () => {},
  pluginHost,
}: GraphProps): React.ReactElement {
  const viewState = useGraphViewStoreState();

  const graphState = useGraphState({
    bidirectionalMode: viewState.bidirectionalMode,
    data,
    directionColor: viewState.directionColor,
    directionMode: viewState.directionMode,
    edgeDecorations,
    favorites: viewState.favorites,
    nodeDecorations,
    nodeSizeMode: viewState.nodeSizeMode,
    showLabels: viewState.showLabels,
    theme,
    timelineActive: viewState.timelineActive,
  });
  const graphLayoutKey = buildGraphLayoutKey(graphState.graphData, viewState.nodeSizeMode);
  const isMacPlatform = detectMacPlatform(getGraphNavigator());

  const interactions = useGraphInteractionRuntime({
    dataRef: graphState.dataRef,
    depthMode: viewState.depthMode,
    fileInfoCacheRef: graphState.fileInfoCacheRef,
    graphContextSelection: graphState.contextSelection,
    graphCursorRef: graphState.graphCursorRef,
    graphDataRef: graphState.graphDataRef,
    graphMode: viewState.graphMode,
    highlightedNeighborsRef: graphState.highlightedNeighborsRef,
    highlightedNodeRef: graphState.highlightedNodeRef,
    isMacPlatform,
    lastClickRef: graphState.lastClickRef,
    lastContainerContextMenuEventRef: graphState.lastContainerContextMenuEventRef,
    lastGraphContextEventRef: graphState.lastGraphContextEventRef,
    openFilterPatternPrompt: onAddFilterRequested,
    openLegendRulePrompt: onAddLegendRequested,
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

  const activeGraph = selectActivePhysicsGraph(
    viewState.graphMode,
    graphState.fg2dRef.current,
    graphState.fg3dRef.current,
  );

  const handleEngineStop = useGraphAutoFit({
    fitView: interactions.interactionHandlers.fitView,
    graphData: graphState.graphData,
    graphMode: viewState.graphMode,
    graphReady: isPhysicsGraphReady(viewState.graphMode, activeGraph),
    handleEngineStop: interactions.handleEngineStop,
  });

  useGraphDebugApi(buildGraphDebugOptions({
    graphMode: viewState.graphMode,
    graphState,
    interactions,
    win: getGraphWindow(),
  }));

  const callbacks = useGraphCallbacks(buildGraphCallbackOptions({ graphState, pluginHost }));

  return (
    <GraphViewportShell
      callbacks={callbacks}
      graphLayoutKey={graphLayoutKey}
      graphState={graphState}
      handleEngineStop={handleEngineStop}
      interactions={interactions}
      pluginHost={pluginHost}
      theme={theme}
      viewState={viewState}
    />
  );
}
