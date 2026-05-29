import {
  updateCodeGraphyWorkspacePluginSelection,
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
    case 'TOGGLE_PLUGIN':
      if (message.payload.packageName) {
        await handlers.updateConfig(
          'plugins',
          updateCodeGraphyWorkspacePluginSelection(
            handlers.getConfig<CodeGraphyWorkspacePluginSettings[]>('plugins', []),
            {
              packageName: message.payload.packageName,
              enabled: message.payload.enabled,
              defaultOptions: message.payload.enabled
                ? handlers.getInstalledPluginDefaultOptions?.(message.payload.packageName)
                : undefined,
            },
          ),
        );
        await handlers.reloadWorkspacePlugins();
        handlers.sendPluginStatuses?.();
        handlers.sendContextMenuItems?.();
        handlers.sendPluginToolbarActions?.();
        handlers.sendGraphViewContributionStatuses?.();
        handlers.sendGraphControls();
        if (message.payload.enabled) {
          await handlers.reprocessPluginFiles([message.payload.pluginId]);
          return true;
        }

        await handlers.analyzeAndSendData();
        return true;
      }

      return false;

    default:
      return false;
  }
}
