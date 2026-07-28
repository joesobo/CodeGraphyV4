import type { GraphViewProviderMessageListenerSource } from '../listener';
import { createPluginGraphWorkScheduler } from '../../settingsMessages/pluginGraphWork';
import type { GraphViewProviderSettingsContext } from './contracts';

type PluginSettingsMethods = Pick<
  GraphViewProviderSettingsContext,
  | 'sendPluginStatuses'
  | 'sendPluginWebviewInjections'
  | 'sendGraphControls'
  | 'schedulePluginGraphWork'
  | 'cancelScheduledPluginGraphWork'
>;

export function createPluginSettingsMethods(
  source: GraphViewProviderMessageListenerSource,
): PluginSettingsMethods {
  const pluginGraphWorkScheduler = createPluginGraphWorkScheduler({
    reloadCachedGraph: () => source._loadAndSendData(),
    smartRebuild: pluginId => source._smartRebuild(pluginId),
  });
  return {
    sendPluginStatuses: () => { source._sendPluginStatuses(); },
    sendPluginWebviewInjections: () => { source._sendPluginWebviewInjections(); },
    sendGraphControls: () => { source._sendGraphControls?.(); },
    schedulePluginGraphWork: request => { pluginGraphWorkScheduler.schedule(request); },
    cancelScheduledPluginGraphWork: () => { pluginGraphWorkScheduler.cancel(); },
  };
}
