import type { IHandlerContext, PartialState } from '../messageTypes';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import {
  applyPendingGroupUpdates,
  applyPendingUserGroupsUpdate,
} from '../optimistic/groups/updates';
import { arePlainValuesEqual } from './equality/compare';

export * from './graphControls';
export * from './graphData';

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
