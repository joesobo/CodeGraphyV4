import { readGraphViewSettings } from './reader';
import { buildGraphViewSettingsMessages } from './messages';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';

interface GraphViewConfigurationLike {
  get<T>(key: string, defaultValue: T): T;
}

interface SendGraphViewSettingsMessagesOptions {
  getConfiguration: () => GraphViewConfigurationLike;
  sendMessage: (message: unknown) => void;
}

export function sendGraphViewSettingsMessages(
  viewContext: object,
  { getConfiguration, sendMessage }: SendGraphViewSettingsMessagesOptions,
): void {
  void viewContext;
  const configuration = getConfiguration();
  const settings = readGraphViewSettings(configuration);

  for (const message of buildGraphViewSettingsMessages(settings)) {
    sendMessage(message);
  }

  for (const message of buildPluginDataMessages(configuration.get('pluginData', {}))) {
    sendMessage(message);
  }
}

function buildPluginDataMessages(pluginData: unknown): Array<Extract<ExtensionToWebviewMessage, { type: 'PLUGIN_DATA_UPDATED' }>> {
  if (!pluginData || typeof pluginData !== 'object' || Array.isArray(pluginData)) {
    return [];
  }

  return Object.entries(pluginData as Record<string, unknown>)
    .filter(([pluginId]) => pluginId.length > 0)
    .map(([pluginId, data]) => ({
      type: 'PLUGIN_DATA_UPDATED' as const,
      payload: { pluginId, data },
    }));
}
