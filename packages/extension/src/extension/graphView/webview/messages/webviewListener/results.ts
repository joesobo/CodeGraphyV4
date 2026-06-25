import type {
  GraphViewMessageListenerContext,
  GraphViewPluginMessageResult,
  GraphViewPrimaryMessageResult,
} from './contracts';

export function applyGraphViewPrimaryMessageResult(
  primaryResult: GraphViewPrimaryMessageResult,
  context: GraphViewMessageListenerContext,
): boolean {
  if (!primaryResult.handled) {
    return false;
  }

  if (primaryResult.userGroups !== undefined) {
    context.setUserGroups(primaryResult.userGroups);
    context.recomputeGroups();
    context.sendGroupsUpdated();
  }
  if (primaryResult.filterPatterns !== undefined) {
    context.setFilterPatterns(primaryResult.filterPatterns);
  }

  return true;
}

export function applyGraphViewPluginMessageResult(
  pluginResult: GraphViewPluginMessageResult,
  context: GraphViewMessageListenerContext,
): void {
  if (pluginResult.handled && pluginResult.readyNotified !== undefined) {
    context.setWebviewReadyNotified(pluginResult.readyNotified);
  }
}
