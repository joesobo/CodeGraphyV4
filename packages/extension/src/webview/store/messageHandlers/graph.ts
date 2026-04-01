import type { IHandlerContext, PartialState } from '../messageTypes';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import {
  applyPendingGroupUpdates,
  applyPendingUserGroupsUpdate,
} from '../optimisticGroups';
import { arePlainValuesEqual } from './equality';

export function handleGraphDataUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'GRAPH_DATA_UPDATED' }>,
): PartialState {
  return { graphData: message.payload, isLoading: false };
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

export function handleGroupsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'GROUPS_UPDATED' }>,
  ctx: IHandlerContext,
): PartialState | void {
  const state = ctx.getState();
  const resolvedUserGroups = applyPendingUserGroupsUpdate(
    message.payload.groups,
    state.optimisticUserGroups,
  );
  const resolved = applyPendingGroupUpdates(
    resolvedUserGroups.groups,
    state.optimisticGroupUpdates,
  );

  if (
    arePlainValuesEqual(state.groups, resolved.groups) &&
    arePlainValuesEqual(state.optimisticUserGroups, resolvedUserGroups.pendingUserGroups) &&
    arePlainValuesEqual(state.optimisticGroupUpdates, resolved.pendingUpdates)
  ) {
    return;
  }

  return {
    groups: resolved.groups,
    optimisticUserGroups: resolvedUserGroups.pendingUserGroups,
    optimisticGroupUpdates: resolved.pendingUpdates,
  };
}

export function handleFilterPatternsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'FILTER_PATTERNS_UPDATED' }>,
): PartialState {
  return {
    filterPatterns: message.payload.patterns,
    pluginFilterPatterns: message.payload.pluginPatterns,
  };
}

export function handleViewsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'VIEWS_UPDATED' }>,
): PartialState {
  return {
    availableViews: message.payload.views,
    activeViewId: message.payload.activeViewId,
  };
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
