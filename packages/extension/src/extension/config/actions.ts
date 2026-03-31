import * as vscode from 'vscode';
import type { GraphViewProvider } from '../graphViewProvider';
import type { ConfigCategory } from './classify';

const GROUP_SETTINGS_DEBOUNCE_MS = 300;
let pendingGroupSettingsRefresh: ReturnType<typeof setTimeout> | undefined;

/** Executes the appropriate provider action for a given config category. */
export function executeConfigAction(
  category: ConfigCategory,
  event: vscode.ConfigurationChangeEvent,
  provider: GraphViewProvider
): void {
  switch (category) {
    case 'physics':
      provider.refreshPhysicsSettings();
      break;
    case 'toggles':
      provider.refreshToggleSettings();
      break;
    case 'display':
      provider.refreshSettings();
      break;
    case 'groups':
      if (pendingGroupSettingsRefresh) {
        clearTimeout(pendingGroupSettingsRefresh);
      }
      pendingGroupSettingsRefresh = setTimeout(() => {
        pendingGroupSettingsRefresh = undefined;
        provider.refreshGroupSettings();
      }, GROUP_SETTINGS_DEBOUNCE_MS);
      break;
    case 'general':
      console.log('[CodeGraphy] Configuration changed, refreshing graph');
      provider.refreshGroupSettings();
      void provider.refresh();
      provider.emitEvent('workspace:configChanged', { key: 'codegraphy', value: undefined, old: undefined });
      if (
        event.affectsConfiguration('codegraphy.filterPatterns') ||
        event.affectsConfiguration('codegraphy.timeline.maxCommits')
      ) {
        void provider.invalidateTimelineCache();
      }
      if (event.affectsConfiguration('codegraphy.timeline.playbackSpeed')) {
        provider.sendPlaybackSpeed();
      }
      break;
  }
}
