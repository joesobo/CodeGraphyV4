import type { IViewContext } from '../../../core/views/contracts';
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
  viewContext: IViewContext,
  { getConfiguration, sendMessage }: SendGraphViewSettingsMessagesOptions,
): void {
  const settings = readGraphViewSettings(getConfiguration() as never);
  viewContext.folderNodeColor = settings.folderNodeColor;

  for (const message of buildGraphViewSettingsMessages(settings)) {
    sendMessage(message);
  }
}
