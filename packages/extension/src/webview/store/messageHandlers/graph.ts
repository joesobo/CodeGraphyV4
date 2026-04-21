import type { IHandlerContext, PartialState } from '../messageTypes';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import {
  applyPendingGroupUpdates,
  applyPendingUserGroupsUpdate,
} from '../optimistic/groups/updates';
import { arePlainValuesEqual } from './equality/compare';

export function handleGraphDataUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'GRAPH_DATA_UPDATED' }>,
): PartialState {
  return {
    graphData: message.payload,
    isLoading: false,
    graphIsIndexing: false,
    graphIndexProgress: null,
  };
}

export function handleGraphIndexStatusUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'GRAPH_INDEX_STATUS_UPDATED' }>,
): PartialState {
  return { graphHasIndex: message.payload.hasIndex };
}

export function handleGraphIndexProgress(
  message: Extract<ExtensionToWebviewMessage, { type: 'GRAPH_INDEX_PROGRESS' }>,
): PartialState {
  return {
    graphIsIndexing: true,
    graphIndexProgress: message.payload,
  };
}

export function handleGraphControlsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'GRAPH_CONTROLS_UPDATED' }>,
): PartialState {
  return {
    graphNodeTypes: message.payload.nodeTypes,
    graphEdgeTypes: message.payload.edgeTypes,
    nodeColors: message.payload.nodeColors,
    nodeColorEnabled: message.payload.nodeColorEnabled,
    nodeVisibility: message.payload.nodeVisibility,
    edgeVisibility: message.payload.edgeVisibility,
  };
}

export function handleFavoritesUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'FAVORITES_UPDATED' }>,
): PartialState {
  return { favorites: new Set(message.payload.favorites) };
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

export function handleActiveFileUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'ACTIVE_FILE_UPDATED' }>,
): PartialState {
  return { activeFilePath: message.payload.filePath ?? null };
}
