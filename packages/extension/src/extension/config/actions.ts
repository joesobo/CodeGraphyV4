import type { GraphViewProvider } from '../graphViewProvider';
import type { ConfigCategory } from './classify';

interface CodeGraphyConfigurationChangeLike {
  affectsConfiguration(section: string): boolean;
}

const GROUP_SETTINGS_DEBOUNCE_MS = 300;
let pendingGroupSettingsRefresh: ReturnType<typeof setTimeout> | undefined;

function scheduleGroupSettingsRefresh(provider: GraphViewProvider): void {
  if (pendingGroupSettingsRefresh) {
    clearTimeout(pendingGroupSettingsRefresh);
  }

  pendingGroupSettingsRefresh = setTimeout(() => {
    pendingGroupSettingsRefresh = undefined;
    provider.refreshGroupSettings();
  }, GROUP_SETTINGS_DEBOUNCE_MS);
}

function shouldInvalidateTimelineCache(event: CodeGraphyConfigurationChangeLike): boolean {
  return (
    event.affectsConfiguration('codegraphy.filterPatterns')
    || event.affectsConfiguration('codegraphy.timeline.maxCommits')
  );
}

function executeGeneralConfigAction(
  event: CodeGraphyConfigurationChangeLike,
  provider: GraphViewProvider,
): void {
  console.log('[CodeGraphy] Configuration changed, refreshing graph');
  provider.refreshGroupSettings();
  void provider.refresh();
  provider.emitEvent('workspace:configChanged', { key: 'codegraphy', value: undefined, old: undefined });

  if (shouldInvalidateTimelineCache(event)) {
    void provider.invalidateTimelineCache();
  }

  if (event.affectsConfiguration('codegraphy.timeline.playbackSpeed')) {
    provider.sendPlaybackSpeed();
  }
}

/** Executes the appropriate provider action for a given config category. */
export function executeConfigAction(
  category: ConfigCategory,
  event: CodeGraphyConfigurationChangeLike,
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
    case 'legend':
      scheduleGroupSettingsRefresh(provider);
      break;
    case 'general':
      executeGeneralConfigAction(event, provider);
      break;
  }
}
