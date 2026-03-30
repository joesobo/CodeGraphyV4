import { readGraphViewSettings } from './reader';
import { buildGraphViewSettingsMessages } from './snapshotMessages';

interface GraphViewConfigurationLike {
  get<T>(key: string, defaultValue: T): T;
}

interface SendGraphViewSettingsMessagesOptions {
  getConfiguration: () => GraphViewConfigurationLike;
  sendMessage: (message: unknown) => void;
}

export function sendGraphViewSettingsMessages(
  viewContext: { folderNodeColor?: string },
  { getConfiguration, sendMessage }: SendGraphViewSettingsMessagesOptions,
): void {
  const settings = readGraphViewSettings(getConfiguration());
  viewContext.folderNodeColor = settings.folderNodeColor;

  for (const message of buildGraphViewSettingsMessages(settings)) {
    sendMessage(message);
  }
}
