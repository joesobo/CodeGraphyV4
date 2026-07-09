/**
 * @fileoverview Graph component that renders the dependency visualization.
 * Uses react-force-graph-2d (2D canvas) or react-force-graph-3d (WebGL) based on graphMode prop.
 * @module webview/components/Graph
 */

import React, { useEffect, useState } from 'react';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../../../shared/plugins/decorations';
import {
  useGraphAutoFit,
} from '../viewport/autoFit';
import { getGraphNavigator, getGraphWindow } from '../environment/browser';
import { buildGraphCallbackOptions } from './callbackOptions';
import { useGraphDebugApi } from '../debug/api';
import { buildGraphDebugOptions } from '../debug/options';
import { buildGraphDataLayoutKey } from './layoutKey';
import { detectMacPlatform } from '../environment/platform';
import { useGraphViewStoreState } from './store';
import { useGraphCallbacks } from '../rendering/useGraphCallbacks';
import { useGraphInteractionRuntime } from '../runtime/use/interaction';
import { useGraphRuntime } from '../runtime/use/state';
import { GraphViewportShell } from '../viewport/shell';
import { ThemeKind } from '../../../theme/useTheme';
import type { WebviewPluginHost } from '../../../pluginHost/manager';
import { useGraphPerfCommit } from '../../../perf/graph/commit';
import { useGraphPerfScenarios } from '../../../perf/graph/useScenarios';
import { useGraphAppearance } from '../appearance/use';

interface GraphProps {
  data: IGraphData;
  theme?: ThemeKind;
  nodeDecorations?: Record<string, NodeDecorationPayload>;
  edgeDecorations?: Record<string, EdgeDecorationPayload>;
  graphViewContributions?: CoreGraphViewContributionSet;
  onAddFilterRequested?: (patterns: string[]) => void;
  onAddLegendRequested?: (rule: { pattern: string; color: string; target: 'node' | 'edge' }) => void;
  pluginHost?: WebviewPluginHost;
  projectionRevision?: object;
}

function hasGraphViewContributions(
  contributions: CoreGraphViewContributionSet | undefined,
): contributions is CoreGraphViewContributionSet {
  return !!contributions
    && (
      contributions.runtimeNodes.length > 0
      || contributions.runtimeEdges.length > 0
      || contributions.projections.length > 0
      || contributions.forces.length > 0
      || contributions.nodeDragEnd.length > 0
      || contributions.contextMenu.length > 0
      || contributions.ui.length > 0
    );
}

function useResolvedGraphViewContributions(
  graphViewContributions: CoreGraphViewContributionSet | undefined,
  pluginHost: WebviewPluginHost | undefined,
): CoreGraphViewContributionSet | undefined {
  const [contributionVersion, setContributionVersion] = useState(0);

  useEffect(() => {
    if (!pluginHost || graphViewContributions) {
      return undefined;
    }

    const subscription = pluginHost.subscribeGraphViewContributions(() => {
      setContributionVersion(version => version + 1);
    });
    return () => subscription.dispose();
  }, [graphViewContributions, pluginHost]);

  void contributionVersion;
  if (graphViewContributions) {
    return graphViewContributions;
  }

  const pluginContributions = pluginHost?.getGraphViewContributions();
  return hasGraphViewContributions(pluginContributions)
    ? pluginContributions
    : undefined;
}

export default function Graph({
  data,
  theme = 'dark',
  nodeDecorations,
  edgeDecorations,
  graphViewContributions,
  onAddFilterRequested = () => {},
  onAddLegendRequested = () => {},
  pluginHost,
  projectionRevision,
}: GraphProps): React.ReactElement {
  const viewState = useGraphViewStoreState();
  const appearance = useGraphAppearance(theme);
  const resolvedGraphViewContributions = useResolvedGraphViewContributions(
    graphViewContributions,
    pluginHost,
  );

  const graphRuntime = useGraphRuntime({
    appearance,
    bidirectionalMode: viewState.bidirectionalMode,
    data,
    directionColor: appearance.linkHighlight,
    directionMode: viewState.directionMode,
    edgeDecorations,
    favorites: viewState.favorites,
    graphViewContributions: resolvedGraphViewContributions,
    graphMode: viewState.graphMode,
    nodeDecorations,
    nodeSizeMode: viewState.nodeSizeMode,
    showLabels: viewState.showLabels,
    theme,
    timelineActive: viewState.timelineActive,
  });
  const graphDataLayoutKey = buildGraphDataLayoutKey(graphRuntime.renderer.graphData, viewState.nodeSizeMode);
  const graphNodeCount = graphRuntime.renderer.graphData.nodes.length;
  useGraphPerfCommit({
    edgeCount: graphRuntime.renderer.graphData.links.length,
    layoutKey: graphNodeCount > 0 ? graphDataLayoutKey : undefined,
    nodeCount: graphNodeCount,
    projectionRevision,
    revision: data,
  });
  const isMacPlatform = detectMacPlatform(getGraphNavigator());

  const interactions = useGraphInteractionRuntime({
    dataRef: graphRuntime.dataRef,
    depthMode: viewState.depthMode,
    fileInfoCacheRef: graphRuntime.renderCaches.fileInfoCacheRef,
    graphContextSelection: graphRuntime.context.selection,
    graphCursorRef: graphRuntime.graphCursorRef,
    graphDataRef: graphRuntime.renderer.graphDataRef,
    graphViewContributions: resolvedGraphViewContributions,
    graphMode: viewState.graphMode,
    highlightedNeighborsRef: graphRuntime.highlightedNeighborsRef,
    highlightedNodeRef: graphRuntime.highlightedNodeRef,
    isMacPlatform,
    lastClickRef: graphRuntime.lastClickRef,
    lastContainerContextMenuEventRef: graphRuntime.context.lastContainerContextMenuEventRef,
    lastGraphContextEventRef: graphRuntime.context.lastGraphContextEventRef,
    openFilterPatternPrompt: onAddFilterRequested,
    openLegendRulePrompt: onAddLegendRequested,
    pluginHost,
    refs: {
      containerRef: graphRuntime.renderer.containerRef,
      fg2dRef: graphRuntime.renderer.fg2dRef,
      fg3dRef: graphRuntime.renderer.fg3dRef,
      rightClickFallbackTimerRef: graphRuntime.context.rightClickFallbackTimerRef,
      rightMouseDownRef: graphRuntime.context.rightMouseDownRef,
      selectedNodesSetRef: graphRuntime.selection.selectedNodeIdsRef,
    },
    setContextSelection: graphRuntime.context.setSelection,
    setHighlightVersion: graphRuntime.setHighlightVersion,
    setSelectedNodes: graphRuntime.selection.setSelectedNodeIds,
    timelineActive: viewState.timelineActive,
  });

  const onEngineTick = useGraphPerfScenarios({
    getContainer: () => graphRuntime.renderer.containerRef.current,
    getGraph: () => viewState.graphMode === '2d'
      ? graphRuntime.renderer.fg2dRef.current
      : graphRuntime.renderer.fg3dRef.current,
    getNodes: () => graphRuntime.renderer.graphDataRef.current.nodes,
    graphMode: viewState.graphMode,
    handleNodeDrag: interactions.handleNodeDrag,
    handleNodeDragEnd: interactions.handleNodeDragEnd,
    zoomGraphView: interactions.interactionHandlers.zoomGraphView,
  });

  const handleEngineStop = useGraphAutoFit({
    handleEngineStop: interactions.handleEngineStop,
  });

  useGraphDebugApi(buildGraphDebugOptions({
    graphMode: viewState.graphMode,
    graphState: graphRuntime,
    interactions,
    win: getGraphWindow(),
  }));

  const callbacks = useGraphCallbacks(buildGraphCallbackOptions({ graphState: graphRuntime, pluginHost }));

  return (
    <GraphViewportShell
      appearance={appearance}
      callbacks={callbacks}
      graphDataLayoutKey={graphDataLayoutKey}
      graphState={graphRuntime}
      graphViewContributions={resolvedGraphViewContributions}
      handleEngineStop={handleEngineStop}
      interactions={interactions}
      onEngineTick={onEngineTick}
      pluginHost={pluginHost}
      theme={theme}
      viewState={viewState}
    />
  );
}
