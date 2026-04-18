import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import type { GraphViewSettingsMessageHandlers } from '../router';

export async function applyPluginOrderUpdate(
  message: Extract<WebviewToExtensionMessage, { type: 'UPDATE_PLUGIN_ORDER' }>,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  await handlers.updateConfig('pluginOrder', message.payload.pluginIds);
  await handlers.reprocessPluginFiles(message.payload.pluginIds);
  return true;
}
