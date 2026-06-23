import type { IHandlerContext, PartialState } from '../messageTypes';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type { IGraphData } from '../../../shared/graph/contracts';
import type { NodeSizeMode } from '../../../shared/settings/modes';
import {
  applyPendingGroupUpdates,
  applyPendingUserGroupsUpdate,
} from '../optimistic/groups/updates';
import { arePlainValuesEqual } from './equality/compare';

type GraphNodeMetricsUpdateMessage = Extract<ExtensionToWebviewMessage, { type: 'GRAPH_NODE_METRICS_UPDATED' }>;
type GraphNodeMetricsUpdate = GraphNodeMetricsUpdateMessage['payload']['nodes'][number];

function areGraphDataPayloadsEqual(left: IGraphData, right: IGraphData): boolean {
  if (left.nodes.length !== right.nodes.length || left.edges.length !== right.edges.length) {
    return false;
  }

  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function shouldSkipDuplicateGraphData(
  state: ReturnType<NonNullable<IHandlerContext['getState']>>,
  payload: IGraphData,
): boolean {
  if (!state.graphData || state.graphIsIndexing || !areGraphDataPayloadsEqual(state.graphData, payload)) {
    return false;
  }

  return (
    (
      state.bootstrapComplete
      && !state.awaitingInitialBootstrap
      && !state.isLoading
    )
    || (
      state.awaitingInitialBootstrap
      && !state.bootstrapComplete
    )
  );
}

function nodeSizeModeUsesNodeMetrics(mode: NodeSizeMode): boolean {
  return mode === 'file-size' || mode === 'churn';
}

function nodeMetricsDiffer(
  node: IGraphData['nodes'][number],
  update: GraphNodeMetricsUpdate,
): boolean {
  return node.fileSize !== update.fileSize || node.churn !== update.churn;
}

function applyMetricUpdatesInPlace(
  graphData: IGraphData,
  updatesById: ReadonlyMap<string, GraphNodeMetricsUpdate>,
): boolean {
  let changed = false;

  for (const node of graphData.nodes) {
    const update = updatesById.get(node.id);
    if (!update || !nodeMetricsDiffer(node, update)) {
      continue;
    }

    node.fileSize = update.fileSize;
    node.churn = update.churn;
    changed = true;
  }

  return changed;
}

export function handleGraphDataUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'GRAPH_DATA_UPDATED' }>,
  ctx?: Pick<IHandlerContext, 'getState'>,
): PartialState | void {
  const state = ctx?.getState();
  if (state && shouldSkipDuplicateGraphData(state, message.payload)) {
    return undefined;
  }

  const waitingForInitialBootstrap = Boolean(
    state?.awaitingInitialBootstrap
    && !state.bootstrapComplete,
  );
  const initialBootstrapFinished = Boolean(
    state?.awaitingInitialBootstrap
    && state.bootstrapComplete
  );

  return {
    graphData: message.payload,
    ...(initialBootstrapFinished ? { awaitingInitialBootstrap: false } : {}),
    isLoading: waitingForInitialBootstrap,
    graphIsIndexing: false,
    graphIndexProgress: null,
  };
}

export function handleGraphNodeMetricsUpdated(
  message: GraphNodeMetricsUpdateMessage,
  ctx?: Pick<IHandlerContext, 'getState'>,
): PartialState | void {
  const state = ctx?.getState();
  if (!state?.graphData) {
    return undefined;
  }

  const updatesById = new Map(message.payload.nodes.map(node => [node.id, node]));
  const waitingForInitialBootstrap = Boolean(
    state.awaitingInitialBootstrap
    && !state.bootstrapComplete,
  );

  if (!nodeSizeModeUsesNodeMetrics(state.nodeSizeMode)) {
    // Metrics do not affect the current visual graph, so keep graphData referentially stable.
    applyMetricUpdatesInPlace(state.graphData, updatesById);

    return {
      isLoading: waitingForInitialBootstrap,
      graphIsIndexing: false,
      graphIndexProgress: null,
    };
  }

  let changed = false;
  const nodes = state.graphData.nodes.map((node) => {
    const update = updatesById.get(node.id);
    if (!update || !nodeMetricsDiffer(node, update)) {
      return node;
    }

    changed = true;
    return {
      ...node,
      fileSize: update.fileSize,
      churn: update.churn,
    };
  });

  if (!changed) {
    return {
      graphIsIndexing: false,
      graphIndexProgress: null,
    };
  }

  return {
    graphData: {
      ...state.graphData,
      nodes,
    },
    isLoading: waitingForInitialBootstrap,
    graphIsIndexing: false,
    graphIndexProgress: null,
  };
}

export function handleAppBootstrapComplete(
  _message: Extract<ExtensionToWebviewMessage, { type: 'APP_BOOTSTRAP_COMPLETE' }>,
  ctx: Pick<IHandlerContext, 'getState'>,
): PartialState {
  const state = ctx.getState();
  const graphReady = state.graphData !== null;

  return {
    bootstrapComplete: true,
    awaitingInitialBootstrap: graphReady ? false : state.awaitingInitialBootstrap,
    isLoading: graphReady ? false : state.isLoading,
  };
}

export function handleGraphIndexStatusUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'GRAPH_INDEX_STATUS_UPDATED' }>,
): PartialState {
  const indexIsReady = message.payload.hasIndex && message.payload.freshness === 'fresh';

  return {
    graphHasIndex: message.payload.hasIndex,
    graphIndexFreshness: message.payload.freshness,
    graphIndexDetail: message.payload.detail,
    ...(indexIsReady ? {
      graphIsIndexing: false,
      graphIndexProgress: null,
    } : {}),
  };
}

export function handleGraphIndexProgress(
  message: Extract<ExtensionToWebviewMessage, { type: 'GRAPH_INDEX_PROGRESS' }>,
): PartialState {
  return {
    graphIsIndexing: true,
    graphIndexProgress: message.payload,
  };
}

function assignChangedGraphControl<K extends keyof PartialState>(
  next: PartialState,
  key: K,
  currentValue: PartialState[K],
  nextValue: PartialState[K],
): void {
  if (!arePlainValuesEqual(currentValue, nextValue)) {
    next[key] = nextValue;
  }
}

export function handleGraphControlsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'GRAPH_CONTROLS_UPDATED' }>,
  ctx?: Pick<IHandlerContext, 'getState'>,
): PartialState | void {
  const state = ctx?.getState();
  if (!state) {
    return {
      graphNodeTypes: message.payload.nodeTypes,
      graphEdgeTypes: message.payload.edgeTypes,
      nodeColors: message.payload.nodeColors,
      nodeVisibility: message.payload.nodeVisibility,
      edgeVisibility: message.payload.edgeVisibility,
    };
  }

  const next: PartialState = {};

  assignChangedGraphControl(next, 'graphNodeTypes', state.graphNodeTypes, message.payload.nodeTypes);
  assignChangedGraphControl(next, 'graphEdgeTypes', state.graphEdgeTypes, message.payload.edgeTypes);
  assignChangedGraphControl(next, 'nodeColors', state.nodeColors, message.payload.nodeColors);
  assignChangedGraphControl(next, 'nodeVisibility', state.nodeVisibility, message.payload.nodeVisibility);
  assignChangedGraphControl(next, 'edgeVisibility', state.edgeVisibility, message.payload.edgeVisibility);

  return Object.keys(next).length > 0 ? next : undefined;
}

export function handleFavoritesUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'FAVORITES_UPDATED' }>,
  ctx?: Pick<IHandlerContext, 'getState'>,
): PartialState {
  const favorites = new Set(message.payload.favorites);
  const pendingFavoriteSnapshot = ctx?.getState().pendingFavoriteSnapshot;

  if (pendingFavoriteSnapshot && !areSetsEqual(favorites, pendingFavoriteSnapshot)) {
    return {};
  }

  return {
    favorites,
    ...(pendingFavoriteSnapshot ? { pendingFavoriteSnapshot: null } : {}),
  };
}

function areSetsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

export function handleSettingsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'SETTINGS_UPDATED' }>,
): PartialState {
  return {
    bidirectionalMode: message.payload.bidirectionalEdges,
    showOrphans: message.payload.showOrphans,
  };
}

export function handleLegendsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'LEGENDS_UPDATED' }>,
  ctx: IHandlerContext,
): PartialState | void {
  const state = ctx.getState();
  const resolvedUserGroups = applyPendingUserGroupsUpdate(
    message.payload.legends,
    state.optimisticUserLegends,
  );
  const resolved = applyPendingGroupUpdates(
    resolvedUserGroups.groups,
    state.optimisticLegendUpdates,
  );

  if (
    arePlainValuesEqual(state.legends, resolved.groups) &&
    arePlainValuesEqual(state.optimisticUserLegends, resolvedUserGroups.pendingUserGroups) &&
    arePlainValuesEqual(state.optimisticLegendUpdates, resolved.pendingUpdates)
  ) {
    return;
  }

  return {
    legends: resolved.groups,
    optimisticUserLegends: resolvedUserGroups.pendingUserGroups,
    optimisticLegendUpdates: resolved.pendingUpdates,
  };
}

export function handleFilterPatternsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'FILTER_PATTERNS_UPDATED' }>,
): PartialState {
  return {
    filterPatterns: message.payload.patterns,
    pluginFilterPatterns: message.payload.pluginPatterns,
    pluginFilterGroups: message.payload.pluginPatternGroups,
    disabledCustomFilterPatterns: message.payload.disabledCustomPatterns,
    disabledPluginFilterPatterns: message.payload.disabledPluginPatterns,
  };
}

export function handleDepthModeUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'DEPTH_MODE_UPDATED' }>,
): PartialState {
  return { depthMode: message.payload.depthMode };
}

export function handlePhysicsSettingsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'PHYSICS_SETTINGS_UPDATED' }>,
): PartialState {
  return { physicsSettings: message.payload };
}

export function handleDepthLimitUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'DEPTH_LIMIT_UPDATED' }>,
): PartialState {
  return { depthLimit: message.payload.depthLimit };
}

export function handleDepthLimitRangeUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'DEPTH_LIMIT_RANGE_UPDATED' }>,
): PartialState {
  return { maxDepthLimit: message.payload.maxDepthLimit };
}

export function handleDirectionSettingsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'DIRECTION_SETTINGS_UPDATED' }>,
): PartialState {
  return {
    directionMode: message.payload.directionMode,
    directionColor: message.payload.directionColor,
    particleSpeed: message.payload.particleSpeed,
    particleSize: message.payload.particleSize,
  };
}

export function handleShowLabelsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'SHOW_LABELS_UPDATED' }>,
): PartialState {
  return { showLabels: message.payload.showLabels };
}

export function handleMaxFilesUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'MAX_FILES_UPDATED' }>,
): PartialState {
  return { maxFiles: message.payload.maxFiles };
}

export function handleVerboseDiagnosticsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'VERBOSE_DIAGNOSTICS_UPDATED' }>,
): PartialState {
  return { verboseDiagnostics: message.payload.verboseDiagnostics };
}

export function handleActiveFileUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'ACTIVE_FILE_UPDATED' }>,
): PartialState {
  return { activeFilePath: message.payload.filePath ?? null };
}
