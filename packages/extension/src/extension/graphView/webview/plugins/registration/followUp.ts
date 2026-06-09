import type {
  GraphViewExternalPluginRegistrationHandlers,
  GraphViewExternalPluginRegistrationState,
} from './register';

export function sendExternalPluginRegistrationUpdates(
  handlers: GraphViewExternalPluginRegistrationHandlers,
): void {
  handlers.refreshWebviewResourceRoots();
  handlers.sendDepthState();
  handlers.sendPluginStatuses();
  handlers.sendContextMenuItems();
  handlers.sendPluginExporters?.();
  handlers.sendPluginToolbarActions?.();
  handlers.sendGraphViewContributionStatuses?.();
  handlers.sendPluginWebviewInjections();
}

export async function runExternalPluginRegistrationFollowUp(
  pluginId: string,
  shouldDeferReadinessReplay: boolean,
  state: GraphViewExternalPluginRegistrationState,
  handlers: GraphViewExternalPluginRegistrationHandlers,
  initializeExternalPlugin: (
    pluginId: string,
    state: GraphViewExternalPluginRegistrationState,
    handlers: GraphViewExternalPluginRegistrationHandlers,
  ) => Promise<void>,
): Promise<void> {
  const hasWorkspaceRoot = Boolean(handlers.getWorkspaceRoot());
  await initializeExternalPlugin(pluginId, state, handlers);
  if (hasWorkspaceRoot) {
    handlers.sendPluginStatuses();
  }
  if (!shouldDeferReadinessReplay) {
    return;
  }

  state.analyzer?.registry.replayReadinessForPlugin(pluginId);
  await handlers.invalidateTimelineCache?.();
  if (state.analyzerInitialized) {
    await handlers.reprocessPluginFiles([pluginId]);
  }
}
