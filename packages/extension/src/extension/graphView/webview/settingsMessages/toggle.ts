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
): CodeGraphyWorkspacePluginSettings[] {
  if (!enabled) {
    return plugins.filter(plugin => plugin.package !== packageName);
  }

  if (plugins.some(plugin => plugin.package === packageName)) {
    return plugins;
  }

  return [...plugins, { package: packageName }];
}

export async function applySettingsToggleMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'TOGGLE_PLUGIN':
      if (message.payload.packageName) {
        const hadLegacyDisabledPlugin = state.disabledPlugins.has(message.payload.pluginId);
        if (message.payload.enabled) {
          state.disabledPlugins.delete(message.payload.pluginId);
        } else {
          state.disabledPlugins.add(message.payload.pluginId);
        }
        await handlers.updateConfig(
          'plugins',
          updateWorkspacePluginSettings(
            handlers.getConfig<CodeGraphyWorkspacePluginSettings[]>('plugins', []),
            message.payload.packageName,
            message.payload.enabled,
          ),
        );
        if (message.payload.enabled && hadLegacyDisabledPlugin) {
          await handlers.updateConfig('disabledPlugins', [...state.disabledPlugins]);
        }
        handlers.smartRebuild(message.payload.pluginId);
        return true;
      }

      if (message.payload.enabled) {
        state.disabledPlugins.delete(message.payload.pluginId);
      } else {
        state.disabledPlugins.add(message.payload.pluginId);
      }
      await handlers.updateConfig('disabledPlugins', [...state.disabledPlugins]);
      handlers.smartRebuild(message.payload.pluginId);
      return true;

    default:
      return false;
  }
}
