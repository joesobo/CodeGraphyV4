import { readGraphViewSettings } from './reader';
import { buildGraphViewSettingsMessages } from './messages';

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
  const settings = readGraphViewSettings(getConfiguration());

  for (const message of buildGraphViewSettingsMessages(settings)) {
    sendMessage(message);
  }
}
