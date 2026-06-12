import {
  createCodeGraphyWorkspacePluginTogglePlan,
  type CodeGraphyWorkspacePluginSettings,
} from '@codegraphy-dev/core';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from './router';

export async function applySettingsToggleMessage(
  message: WebviewToExtensionMessage,
  _state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'TOGGLE_PLUGIN': {
      const plan = createCodeGraphyWorkspacePluginTogglePlan(
        handlers.getConfig<CodeGraphyWorkspacePluginSettings[]>('plugins', []),
        {
          pluginId: message.payload.pluginId,
          enabled: message.payload.enabled,
          defaultOptions: message.payload.enabled
            ? handlers.getInstalledPluginDefaultOptions?.(message.payload.pluginId)
            : undefined,
        },
      );
      await handlers.updateConfig('plugins', plan.plugins);
      await (handlers.syncWorkspacePlugins?.() ?? handlers.reloadWorkspacePlugins());
      if (message.payload.enabled) {
        handlers.sendPluginWebviewInjections?.();
      }
      handlers.sendPluginStatuses?.();
      handlers.sendContextMenuItems?.();
      handlers.sendPluginToolbarActions?.();
      handlers.sendGraphViewContributionStatuses?.();
      handlers.sendGraphControls();
      if (plan.indexing.kind === 'reprocess-plugin-files') {
        await handlers.reprocessPluginFiles(plan.indexing.pluginIds);
        return true;
      }

      handlers.smartRebuild(message.payload.pluginId);
      return true;
    }

    default:
      return false;
  }
}
