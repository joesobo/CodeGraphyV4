import * as vscode from 'vscode';
import type { GraphViewProvider } from './graphViewProvider';

/**
 * Registers a configuration-change listener and routes each setting category
 * to the appropriate provider refresh method.
 */
export function registerConfigHandler(
  context: vscode.ExtensionContext,
  provider: GraphViewProvider
): void {
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('codegraphy.physics')) {
        provider.refreshPhysicsSettings();
      } else if (
        event.affectsConfiguration('codegraphy.disabledRules') ||
        event.affectsConfiguration('codegraphy.disabledPlugins')
      ) {
        provider.refreshToggleSettings();
      } else if (
        event.affectsConfiguration('codegraphy.directionMode') ||
        event.affectsConfiguration('codegraphy.directionColor') ||
        event.affectsConfiguration('codegraphy.particleSpeed') ||
        event.affectsConfiguration('codegraphy.particleSize') ||
        event.affectsConfiguration('codegraphy.showLabels') ||
        event.affectsConfiguration('codegraphy.bidirectionalEdges')
      ) {
        provider.refreshSettings();
      } else if (
        event.affectsConfiguration('codegraphy.groups') ||
        event.affectsConfiguration('codegraphy.hiddenPluginGroups')
      ) {
        // Groups/hidden groups: already handled by the webview message handlers
        // (UPDATE_GROUPS, TOGGLE_PLUGIN_GROUP_DISABLED, etc.) which call _sendGroupsUpdated() directly.
        // No re-analysis needed — skip to avoid double refresh.
      } else if (event.affectsConfiguration('codegraphy')) {
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
      }
    })
  );
}
