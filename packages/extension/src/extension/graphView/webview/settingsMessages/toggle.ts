import type { CodeGraphyWorkspacePluginSettings } from '@codegraphy/core';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from './router';

function updateWorkspacePluginSettings(
  plugins: CodeGraphyWorkspacePluginSettings[],
  packageName: string,
  enabled: boolean,
  defaultOptions?: Record<string, unknown>,
): CodeGraphyWorkspacePluginSettings[] {
  if (!enabled) {
    return plugins.filter(plugin => plugin.package !== packageName);
  }

  if (plugins.some(plugin => plugin.package === packageName)) {
    return plugins;
  }

  const nextPlugin: CodeGraphyWorkspacePluginSettings = { package: packageName };
  if (defaultOptions && Object.keys(defaultOptions).length > 0) {
    nextPlugin.options = { ...defaultOptions };
  }

  return [...plugins, nextPlugin];
}

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
          updateWorkspacePluginSettings(
            handlers.getConfig<CodeGraphyWorkspacePluginSettings[]>('plugins', []),
            message.payload.packageName,
            message.payload.enabled,
            message.payload.enabled
              ? handlers.getInstalledPluginDefaultOptions?.(message.payload.packageName)
            : undefined,
          ),
        );
        await handlers.reloadWorkspacePlugins();
        handlers.sendGraphViewContributionStatuses?.();
        await handlers.analyzeAndSendData();
        return true;
      }

      return false;

    default:
      return false;
  }
}
