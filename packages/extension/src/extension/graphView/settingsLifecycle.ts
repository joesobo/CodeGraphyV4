import type { ExtensionToWebviewMessage, ISettingsSnapshot } from '../../shared/types';
import { applyGraphViewAllSettingsSnapshot, type GraphViewAllSettingsSyncState } from './allSettingsSync';
import { sendGraphViewSettingsMessages } from './settingsMessage';

interface GraphViewConfigurationLike {
  get<T>(key: string, defaultValue: T): T;
}

interface SendGraphViewProviderSettingsOptions {
  getConfiguration: () => GraphViewConfigurationLike;
  sendMessage: (message: ExtensionToWebviewMessage) => void;
}

interface SendGraphViewProviderAllSettingsOptions {
  captureSettingsSnapshot: () => ISettingsSnapshot;
  getPluginFilterPatterns: () => string[];
  sendMessage: (message: ExtensionToWebviewMessage) => void;
  recomputeGroups: () => void;
  sendGroupsUpdated: () => void;
}

export function sendGraphViewProviderSettings(
  viewContext: GraphViewAllSettingsSyncState['viewContext'],
  { getConfiguration, sendMessage }: SendGraphViewProviderSettingsOptions,
): void {
  sendGraphViewSettingsMessages(viewContext as never, {
    getConfiguration,
    sendMessage: message => sendMessage(message as ExtensionToWebviewMessage),
  });
}

export function sendGraphViewProviderAllSettings(
  state: GraphViewAllSettingsSyncState,
  {
    captureSettingsSnapshot,
    getPluginFilterPatterns,
    sendMessage,
    recomputeGroups,
    sendGroupsUpdated,
  }: SendGraphViewProviderAllSettingsOptions,
): void {
  applyGraphViewAllSettingsSnapshot(
    captureSettingsSnapshot(),
    getPluginFilterPatterns(),
    state,
    {
      sendMessage,
      recomputeGroups,
      sendGroupsUpdated,
    },
  );
}
