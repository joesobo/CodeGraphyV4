/**
 * @fileoverview Graph component that renders the dependency visualization.
 * Uses react-force-graph-2d (2D canvas) or react-force-graph-3d (WebGL) based on graphMode prop.
 * @module webview/components/Graph
 */

import React, { useEffect, useState } from 'react';
import type { CoreGraphViewContributionSet } from '@codegraphy/core';
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
import { useGraphState } from '../runtime/use/state';
import { isPhysicsGraphReady, selectActivePhysicsGraph } from '../runtime/physicsLifecycle/readiness';
import { GraphViewportShell } from '../viewport/shell';
import { ThemeKind } from '../../../theme/useTheme';
import type { WebviewPluginHost } from '../../../pluginHost/manager';
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
}: GraphProps): React.ReactElement {
  const viewState = useGraphViewStoreState();
  const appearance = useGraphAppearance(theme);
  const resolvedGraphViewContributions = useResolvedGraphViewContributions(
    graphViewContributions,
    pluginHost,
  );

  const graphState = useGraphState({
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
  const graphDataLayoutKey = buildGraphDataLayoutKey(graphState.graphData, viewState.nodeSizeMode);
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
      appearance={appearance}
      callbacks={callbacks}
      graphDataLayoutKey={graphDataLayoutKey}
      graphState={graphState}
      graphViewContributions={resolvedGraphViewContributions}
      handleEngineStop={handleEngineStop}
      interactions={interactions}
      pluginHost={pluginHost}
      theme={theme}
      viewState={viewState}
    />
  );
}
