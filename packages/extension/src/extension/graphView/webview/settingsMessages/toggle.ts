import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from './router';

export async function applySettingsToggleMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'TOGGLE_PLUGIN':
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
