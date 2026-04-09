import type { GraphViewMessageListenerContext } from '../messages/listener';
import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerSource,
} from './listener';
import { updateHiddenPluginGroups } from './hiddenPluginGroups';
import { createGraphViewProviderPluginApis } from './pluginApis';
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
  | 'getHiddenPluginGroupIds'
  | 'loadGroupsAndFilterPatterns'
  | 'loadDisabledRulesAndPlugins'
  | 'sendDepthState'
  | 'sendGraphControls'
  | 'sendFavorites'
  | 'sendSettings'
  | 'sendCachedTimeline'
  | 'sendDecorations'
  | 'sendContextMenuItems'
  | 'sendPluginExporters'
  | 'sendPluginToolbarActions'
  | 'sendPluginWebviewInjections'
  | 'sendActiveFile'
  | 'waitForFirstWorkspaceReady'
  | 'notifyWebviewReady'
  | 'getInteractionPluginApi'
  | 'getContextMenuPluginApi'
  | 'getExporterPluginApi'
  | 'getToolbarActionPluginApi'
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
  const pluginApis = createGraphViewProviderPluginApis(source);

  return {
    getPluginFilterPatterns: () => source._analyzer?.getPluginFilterPatterns() ?? [],
    hasWorkspace: () => (dependencies.workspace.workspaceFolders?.length ?? 0) > 0,
    isFirstAnalysis: () => source._firstAnalysis,
    isWebviewReadyNotified: () => source._webviewReadyNotified,
    getHiddenPluginGroupIds: () => source._hiddenPluginGroupIds,
    loadGroupsAndFilterPatterns: () => source._loadGroupsAndFilterPatterns(),
    loadDisabledRulesAndPlugins: () => source._loadDisabledRulesAndPlugins(),
    sendDepthState: () => source._sendDepthState(),
    sendGraphControls: () => source._sendGraphControls?.(),
    sendFavorites: () => source._sendFavorites(),
    sendSettings: () => source._sendSettings(),
    sendCachedTimeline: () => source._sendCachedTimeline(),
    sendDecorations: () => source._sendDecorations(),
    sendContextMenuItems: () => source._sendContextMenuItems(),
    sendPluginExporters: () => source._sendPluginExporters?.(),
    sendPluginToolbarActions: () => source._sendPluginToolbarActions?.(),
    sendPluginWebviewInjections: () => source._sendPluginWebviewInjections(),
    sendActiveFile: () => source._sendMessage({
      type: 'ACTIVE_FILE_UPDATED',
      payload: { filePath: source._viewContext.focusedFile },
    }),
    waitForFirstWorkspaceReady: () => source._firstWorkspaceReadyPromise,
    notifyWebviewReady: pluginApis.notifyWebviewReady,
    getInteractionPluginApi: pluginApis.getInteractionPluginApi,
    getContextMenuPluginApi: pluginApis.getContextMenuPluginApi,
    getExporterPluginApi: pluginApis.getExporterPluginApi,
    getToolbarActionPluginApi: pluginApis.getToolbarActionPluginApi,
    emitEvent: (event, payload) => {
      source._eventBus.emit(event, payload);
    },
    logError: (label, error) => {
      console.error(label, error);
    },
    updateHiddenPluginGroups: async groupIds => {
      await updateHiddenPluginGroups(dependencies, groupIds);
    },
    setUserGroups: groups => setPluginUserGroups(source, groups),
    setFilterPatterns: patterns => setPluginFilterPatterns(source, patterns),
    setWebviewReadyNotified: readyNotified =>
      setPluginWebviewReadyNotified(source, readyNotified),
  };
}
