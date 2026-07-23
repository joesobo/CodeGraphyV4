import type { GraphViewMessageListenerContext } from '../messages/listener';
import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerSource,
} from './listener';
import {
  setPluginFilterPatterns,
  setPluginUserGroups,
  setPluginWebviewReadyNotified,
} from './pluginState';

type GraphViewProviderPluginContext = Pick<
  GraphViewMessageListenerContext,
  | 'getPluginFilterPatterns'
  | 'hasWorkspace'
  | 'isFirstAnalysis'
  | 'isWebviewReadyNotified'
  | 'loadGroupsAndFilterPatterns'
  | 'loadDisabledRulesAndPlugins'
  | 'sendDepthState'
  | 'sendGraphControls'
  | 'sendFavorites'
  | 'sendSettings'
  | 'sendDecorations'
  | 'sendPluginWebviewInjections'
  | 'sendActiveFile'
  | 'waitForFirstWorkspaceReady'
  | 'notifyWebviewReady'
  | 'logError'
  | 'setUserGroups'
  | 'setFilterPatterns'
  | 'setWebviewReadyNotified'
>;

export function createGraphViewProviderMessagePluginContext(
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies,
): GraphViewProviderPluginContext {
  return {
    getPluginFilterPatterns: () =>
      typeof source._analyzer?.getPluginFilterPatterns === 'function'
        ? source._analyzer.getPluginFilterPatterns()
        : [],
    hasWorkspace: () => (dependencies.workspace.workspaceFolders?.length ?? 0) > 0,
    isFirstAnalysis: () => source._firstAnalysis,
    isWebviewReadyNotified: () => source._webviewReadyNotified,
    loadGroupsAndFilterPatterns: () => source._loadGroupsAndFilterPatterns(),
    loadDisabledRulesAndPlugins: () => source._loadDisabledRulesAndPlugins(),
    sendDepthState: () => source._sendDepthState(),
    sendGraphControls: () => source._sendGraphControls?.(),
    sendFavorites: () => source._sendFavorites(),
    sendSettings: () => source._sendSettings(),
    sendDecorations: () => source._sendDecorations(),
    sendPluginWebviewInjections: () => source._sendPluginWebviewInjections(),
    sendActiveFile: () => source._sendMessage({
      type: 'ACTIVE_FILE_UPDATED',
      payload: { filePath: source._viewContext.focusedFile },
    }),
    waitForFirstWorkspaceReady: () => source._firstWorkspaceReadyPromise,
    notifyWebviewReady: () => source._analyzer?.registry?.notifyWebviewReady(),
    logError: (label, error) => {
      console.error(label, error);
    },
    setUserGroups: groups => setPluginUserGroups(source, groups),
    setFilterPatterns: patterns => setPluginFilterPatterns(source, patterns),
    setWebviewReadyNotified: readyNotified =>
      setPluginWebviewReadyNotified(source, readyNotified),
  };
}
