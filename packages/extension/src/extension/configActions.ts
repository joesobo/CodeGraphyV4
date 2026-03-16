import * as vscode from 'vscode';
import type { GraphViewProvider } from './graphViewProvider';
import type { ConfigCategory } from './configChangeDetection';

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
      // Groups/hidden groups: already handled by the webview message handlers
      // (UPDATE_GROUPS, TOGGLE_PLUGIN_GROUP_DISABLED, etc.) which call _sendGroupsUpdated() directly.
      // No re-analysis needed — skip to avoid double refresh.
      break;
    case 'general':
      console.log('[CodeGraphy] Configuration changed, refreshing graph');
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
