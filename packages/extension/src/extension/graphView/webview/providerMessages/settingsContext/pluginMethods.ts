import type { GraphViewProviderMessageListenerSource } from '../listener';
import { reprocessPluginFiles } from './pluginFiles';
import { createPluginGraphWorkScheduler } from '../../settingsMessages/pluginGraphWork';
import type { GraphViewProviderSettingsContext } from './contracts';

type PluginSettingsMethods = Pick<
  GraphViewProviderSettingsContext,
  | 'reloadWorkspacePlugins'
  | 'syncWorkspacePlugins'
  | 'sendPluginStatuses'
  | 'sendPluginWebviewInjections'
  | 'sendGraphControls'
  | 'schedulePluginGraphWork'
  | 'cancelScheduledPluginGraphWork'
  | 'reprocessPluginFiles'
>;

function runWorkspacePluginUpdate(
  source: GraphViewProviderMessageListenerSource,
  update: () => Promise<void>,
): Promise<void> {
  source._analyzerInitialized = false;
  const updatePromise = Promise.resolve()
    .then(update)
    .then(() => { source._analyzerInitialized = true; })
    .finally(() => {
      if (source._analyzerInitPromise === updatePromise) {
        source._analyzerInitPromise = undefined;
      }
    });
  source._analyzerInitPromise = updatePromise;
  return updatePromise;
}

export function createPluginSettingsMethods(
  source: GraphViewProviderMessageListenerSource,
): PluginSettingsMethods {
  const pluginGraphWorkScheduler = createPluginGraphWorkScheduler({
    analyzeAndSendData: () => source._analyzeAndSendData(),
    reprocessPluginFiles: pluginIds => reprocessPluginFiles(source, pluginIds),
    smartRebuild: pluginId => source._smartRebuild(pluginId),
  });
  const runAnalyzerMethod = (
    method: (() => Promise<void>) | undefined,
  ): Promise<void> => method ? runWorkspacePluginUpdate(source, method) : Promise.resolve();

  return {
    reloadWorkspacePlugins: () => runAnalyzerMethod(
      source._analyzer?.reloadWorkspacePlugins?.bind(source._analyzer),
    ),
    syncWorkspacePlugins: () => runAnalyzerMethod(
      source._analyzer?.syncWorkspacePlugins?.bind(source._analyzer),
    ),
    sendPluginStatuses: () => { source._sendPluginStatuses(); },
    sendPluginWebviewInjections: () => { source._sendPluginWebviewInjections(); },
    sendGraphControls: () => { source._sendGraphControls?.(); },
    schedulePluginGraphWork: request => { pluginGraphWorkScheduler.schedule(request); },
    cancelScheduledPluginGraphWork: () => { pluginGraphWorkScheduler.cancel(); },
    reprocessPluginFiles: pluginIds => reprocessPluginFiles(source, pluginIds),
  };
}
