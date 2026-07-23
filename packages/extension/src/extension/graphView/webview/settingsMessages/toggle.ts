import {
  createCodeGraphyWorkspacePluginTogglePlan,
  type CodeGraphyWorkspacePluginSettings,
} from '@codegraphy-dev/core';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from './router';
import { sendFilterPatternsUpdated } from './updates/apply/filterPatternNotification';
import { applyPluginGraphWorkPlan } from './pluginGraphWork';

export async function applySettingsToggleMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'TOGGLE_PLUGIN': {
      const plan = createCodeGraphyWorkspacePluginTogglePlan(
        handlers.getConfig<CodeGraphyWorkspacePluginSettings[]>('plugins', []),
        {
          pluginId: message.payload.pluginId,
          enabled: message.payload.enabled,
          updateImpact: handlers.getInstalledPluginUpdateImpact?.(message.payload.pluginId),
        },
      );
      await handlers.updateConfig('plugins', plan.plugins);
      await (handlers.syncWorkspacePlugins?.() ?? handlers.reloadWorkspacePlugins());
      if (message.payload.enabled) {
        replaySavedPluginData(message.payload.pluginId, handlers);
        handlers.sendPluginWebviewInjections?.();
      }
      handlers.sendContextMenuItems?.();
      handlers.sendPluginToolbarActions?.();
      handlers.sendGraphViewContributionStatuses?.();
      if (!message.payload.enabled) {
        handlers.sendPluginStatuses?.();
      }
      sendFilterPatternsUpdated(state, handlers);
      try {
        await applyPluginToggleGraphWorkPlan(
          plan.indexing,
          message.payload.pluginId,
          handlers,
        );
      } finally {
        handlers.sendGraphControls();
        handlers.sendPluginStatuses?.();
      }
      return true;
    }

    default:
      return false;
  }
}

async function applyPluginToggleGraphWorkPlan(
  plan: ReturnType<typeof createCodeGraphyWorkspacePluginTogglePlan>['indexing'],
  pluginId: string,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<void> {
  await applyPluginGraphWorkPlan(plan, pluginId, {
    analyzeAndSendData: () => handlers.analyzeAndSendData(),
    reprocessPluginFiles: pluginIds => handlers.reprocessPluginFiles(pluginIds),
    smartRebuild: id => handlers.smartRebuild(id),
  });
}

function replaySavedPluginData(
  pluginId: string,
  handlers: GraphViewSettingsMessageHandlers,
): void {
  const pluginData = handlers.getConfig<Record<string, unknown>>('pluginData', {});
  if (!pluginData || typeof pluginData !== 'object' || Array.isArray(pluginData) || !(pluginId in pluginData)) {
    return;
  }

  handlers.sendMessage({
    type: 'PLUGIN_DATA_UPDATED',
    payload: {
      pluginId,
      data: pluginData[pluginId],
    },
  });
}
