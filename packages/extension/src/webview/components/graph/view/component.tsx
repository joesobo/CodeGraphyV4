/**
 * @fileoverview Graph component that renders the dependency visualization.
 * Uses the 2D graph surface.
 * @module webview/components/Graph
 */

import React from 'react';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../../../shared/plugins/decorations';
import {
  useGraphAutoFit,
} from '../viewport/autoFit';
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
import { useGraphViewContributions } from '../../../pluginHost/useGraphViewContributions';
import { useGraphAppearance } from '../appearance/use';

interface GraphProps {
  data: IGraphData;
  theme?: ThemeKind;
  nodeDecorations?: Record<string, NodeDecorationPayload>;
  edgeDecorations?: Record<string, EdgeDecorationPayload>;
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
      || contributions.nodeDragEnd.length > 0
      || contributions.contextMenu.length > 0
      || contributions.ui.length > 0
    );
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
  const appearance = useGraphAppearance(theme);
  const pluginContributions = useGraphViewContributions(pluginHost);
  const graphViewContributions = hasGraphViewContributions(pluginContributions)
    ? pluginContributions
    : undefined;

  const graphRuntime = useGraphRuntime({
    appearance,
    bidirectionalMode: viewState.bidirectionalMode,
    data,
    directionColor: appearance.linkHighlight,
    directionMode: viewState.directionMode,
    edgeDecorations,
    favorites: viewState.favorites,
    graphViewContributions,
    nodeDecorations,
    nodeSizeMode: viewState.nodeSizeMode,
    showLabels: viewState.showLabels,
    theme,
  });
  const graphDataLayoutKey = buildGraphDataLayoutKey(graphRuntime.renderer.graphData, viewState.nodeSizeMode);
  const isMacPlatform = detectMacPlatform(globalThis.navigator);

  const interactions = useGraphInteractionRuntime({
    dataRef: graphRuntime.dataRef,
    depthMode: viewState.depthMode,
    fileInfoCacheRef: graphRuntime.renderCaches.fileInfoCacheRef,
    graphContextSelection: graphRuntime.context.selection,
    graphCursorRef: graphRuntime.graphCursorRef,
    graphDataRef: graphRuntime.renderer.graphDataRef,
    graphViewContributions,
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
      rightClickFallbackTimerRef: graphRuntime.context.rightClickFallbackTimerRef,
      rightMouseDownRef: graphRuntime.context.rightMouseDownRef,
      selectedNodesSetRef: graphRuntime.selection.selectedNodeIdsRef,
    },
    setContextSelection: graphRuntime.context.setSelection,
    setSelectedNodes: graphRuntime.selection.setSelectedNodeIds,
  });

  const handleEngineStop = useGraphAutoFit({
    handleEngineStop: interactions.handleEngineStop,
  });

  useGraphDebugApi(buildGraphDebugOptions({
    graphState: graphRuntime,
    interactions,
    win: globalThis.window,
  }));

  const callbacks = useGraphCallbacks(buildGraphCallbackOptions({ graphState: graphRuntime, pluginHost }));

  return (
    <GraphViewportShell
      appearance={appearance}
      callbacks={callbacks}
      graphDataLayoutKey={graphDataLayoutKey}
      graphState={graphRuntime}
      graphViewContributions={graphViewContributions}
      handleEngineStop={handleEngineStop}
      interactions={interactions}
      pluginHost={pluginHost}
      theme={theme}
      viewState={viewState}
    />
  );
}
