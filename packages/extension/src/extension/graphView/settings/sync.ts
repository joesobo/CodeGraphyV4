import type { ExtensionToWebviewMessage, IGroup, ISettingsSnapshot } from '../../../shared/types';
import { buildGraphViewAllSettingsMessages } from './index';

export interface GraphViewAllSettingsSyncState {
  viewContext: { folderNodeColor?: string };
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

  state.viewContext.folderNodeColor = snapshot.folderNodeColor;
  for (const message of messages.preGroupMessages) {
    handlers.sendMessage(message);
  }

  state.hiddenPluginGroupIds = new Set(snapshot.hiddenPluginGroups);
  state.userGroups = snapshot.groups;
  state.filterPatterns = snapshot.filterPatterns;
  handlers.recomputeGroups();
  handlers.sendGroupsUpdated();

  for (const message of messages.postGroupMessages) {
    handlers.sendMessage(message);
  }
}
