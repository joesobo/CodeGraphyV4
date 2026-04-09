import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type { IGroup } from '../../../shared/settings/groups';
import type { ISettingsSnapshot } from '../../../shared/settings/snapshot';
import { buildGraphViewAllSettingsMessages } from './messages';

export interface GraphViewAllSettingsSyncState {
  viewContext: object;
  hiddenPluginGroupIds: Set<string>;
  userGroups: IGroup[];
  filterPatterns: string[];
}

export interface GraphViewAllSettingsSyncHandlers {
  sendMessage(message: ExtensionToWebviewMessage): void;
  recomputeGroups(): void;
  sendGroupsUpdated(): void;
}

export function applyGraphViewAllSettingsSnapshot(
  snapshot: ISettingsSnapshot,
  pluginFilterPatterns: string[],
  state: GraphViewAllSettingsSyncState,
  handlers: GraphViewAllSettingsSyncHandlers,
): void {
  const messages = buildGraphViewAllSettingsMessages(snapshot, pluginFilterPatterns);

  for (const message of messages.preGroupMessages) {
    handlers.sendMessage(message);
  }

  state.hiddenPluginGroupIds = new Set(snapshot.hiddenPluginGroups);
  state.userGroups = snapshot.legends;
  state.filterPatterns = snapshot.filterPatterns;
  handlers.recomputeGroups();
  handlers.sendGroupsUpdated();

  for (const message of messages.postGroupMessages) {
    handlers.sendMessage(message);
  }
}
