import type { GraphViewMessageListenerContext } from '../webviewListener';
import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerSource,
} from './listener';

type GraphViewProviderPluginContext = Pick<
  GraphViewMessageListenerContext,
  | 'getPluginFilterPatterns'
  | 'hasWorkspace'
  | 'isFirstAnalysis'
  | 'isWebviewReadyNotified'
  | 'getHiddenPluginGroupIds'
  | 'loadGroupsAndFilterPatterns'
  | 'loadDisabledRulesAndPlugins'
  | 'sendFavorites'
  | 'sendSettings'
  | 'sendCachedTimeline'
  | 'sendDecorations'
  | 'sendContextMenuItems'
  | 'sendPluginWebviewInjections'
  | 'waitForFirstWorkspaceReady'
  | 'notifyWebviewReady'
  | 'getInteractionPluginApi'
  | 'getContextMenuPluginApi'
  | 'emitEvent'
  | 'logError'
  | 'updateHiddenPluginGroups'
  | 'setUserGroups'
  | 'setFilterPatterns'
  | 'setWebviewReadyNotified'
>;

export function createGraphViewProviderMessagePluginContext(
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies,
): GraphViewProviderPluginContext {
  return {
    getPluginFilterPatterns: () => source._analyzer?.getPluginFilterPatterns() ?? [],
    hasWorkspace: () => (dependencies.workspace.workspaceFolders?.length ?? 0) > 0,
    isFirstAnalysis: () => source._firstAnalysis,
    isWebviewReadyNotified: () => source._webviewReadyNotified,
    getHiddenPluginGroupIds: () => source._hiddenPluginGroupIds,
    loadGroupsAndFilterPatterns: () => source._loadGroupsAndFilterPatterns(),
    loadDisabledRulesAndPlugins: () => source._loadDisabledRulesAndPlugins(),
    sendFavorites: () => source._sendFavorites(),
    sendSettings: () => source._sendSettings(),
    sendCachedTimeline: () => source._sendCachedTimeline(),
    sendDecorations: () => source._sendDecorations(),
    sendContextMenuItems: () => source._sendContextMenuItems(),
    sendPluginWebviewInjections: () => source._sendPluginWebviewInjections(),
    waitForFirstWorkspaceReady: () => source._firstWorkspaceReadyPromise,
    notifyWebviewReady: () => source._analyzer?.registry?.notifyWebviewReady(),
    getInteractionPluginApi: pluginId => source._analyzer?.registry?.getPluginAPI(pluginId) as never,
    getContextMenuPluginApi: pluginId => source._analyzer?.registry?.getPluginAPI(pluginId) as never,
    emitEvent: (event, payload) => {
      source._eventBus.emit(event, payload);
    },
    logError: (label, error) => {
      console.error(label, error);
    },
    updateHiddenPluginGroups: groupIds => {
      const target = dependencies.getConfigTarget(dependencies.workspace.workspaceFolders);
      return Promise.resolve(
        dependencies.workspace.getConfiguration('codegraphy').update(
          'hiddenPluginGroups',
          groupIds,
          target,
        ),
      );
    },
    setUserGroups: groups => {
      source._userGroups = groups;
    },
    setFilterPatterns: patterns => {
      source._filterPatterns = patterns;
    },
    setWebviewReadyNotified: readyNotified => {
      source._webviewReadyNotified = readyNotified;
    },
  };
}
