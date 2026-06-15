import type { WebviewToExtensionMessage } from '../../../../../../shared/protocol/webviewToExtension';
import type { GraphViewSettingsMessageHandlers } from '../../router';

export async function applyPluginDataMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (message.type !== 'UPDATE_PLUGIN_DATA') {
    return false;
  }

  const { pluginId, data } = message.payload;
  if (pluginId.length === 0) {
    return true;
  }

  const pluginData = {
    ...handlers.getConfig<Record<string, unknown>>('pluginData', {}),
    [pluginId]: data,
  };
  await handlers.updateConfig('pluginData', pluginData);
  handlers.sendMessage({
    type: 'PLUGIN_DATA_UPDATED',
    payload: { pluginId, data },
  });
  return true;
}
