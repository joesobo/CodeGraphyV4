import type { WebviewToExtensionMessage } from '../../../../shared/contracts';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from './index';

export async function applySettingsToggleMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'TOGGLE_RULE':
      if (message.payload.enabled) {
        state.disabledRules.delete(message.payload.qualifiedId);
      } else {
        state.disabledRules.add(message.payload.qualifiedId);
      }
      await handlers.updateConfig('disabledRules', [...state.disabledRules]);
      handlers.smartRebuild('rule', message.payload.qualifiedId);
      return true;

    case 'TOGGLE_PLUGIN':
      if (message.payload.enabled) {
        state.disabledPlugins.delete(message.payload.pluginId);
      } else {
        state.disabledPlugins.add(message.payload.pluginId);
      }
      await handlers.updateConfig('disabledPlugins', [...state.disabledPlugins]);
      handlers.smartRebuild('plugin', message.payload.pluginId);
      return true;

    default:
      return false;
  }
}
