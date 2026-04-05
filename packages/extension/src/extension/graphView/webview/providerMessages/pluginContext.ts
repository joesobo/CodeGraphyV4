import type { GraphViewMessageListenerContext } from '../messages/listener';
import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerSource,
} from './listener';

type GraphViewInteractionPluginApi = {
  deliverWebviewMessage(message: { type: string; data: unknown }): void;
};

type GraphViewContextMenuPluginApi = {
  contextMenuItems: ReadonlyArray<{ action(target: unknown): Promise<void> | void }>;
};

type GraphViewExporterPluginApi = {
  exporters: ReadonlyArray<{ run(): Promise<void> | void }>;
};

type GraphViewProviderPluginContext = Pick<
  GraphViewMessageListenerContext,
  | 'getPluginFilterPatterns'
  | 'hasWorkspace'
  | 'isFirstAnalysis'
  | 'isWebviewReadyNotified'
  | 'getHiddenPluginGroupIds'
  | 'loadGroupsAndFilterPatterns'
  | 'loadDisabledRulesAndPlugins'
  | 'sendAvailableViews'
  | 'sendFavorites'
  | 'sendSettings'
  | 'sendCachedTimeline'
  | 'sendDecorations'
  | 'sendContextMenuItems'
  | 'sendPluginExporters'
  | 'sendPluginWebviewInjections'
  | 'sendActiveFile'
  | 'waitForFirstWorkspaceReady'
  | 'notifyWebviewReady'
  | 'getInteractionPluginApi'
  | 'getContextMenuPluginApi'
  | 'getExporterPluginApi'
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
    sendAvailableViews: () => source._sendAvailableViews(),
    sendFavorites: () => source._sendFavorites(),
    sendSettings: () => source._sendSettings(),
    sendCachedTimeline: () => source._sendCachedTimeline(),
    sendDecorations: () => source._sendDecorations(),
    sendContextMenuItems: () => source._sendContextMenuItems(),
    sendPluginExporters: () => source._sendPluginExporters?.(),
    sendPluginWebviewInjections: () => source._sendPluginWebviewInjections(),
    sendActiveFile: () => source._sendMessage({
      type: 'ACTIVE_FILE_UPDATED',
      payload: { filePath: source._viewContext.focusedFile },
    }),
    waitForFirstWorkspaceReady: () => source._firstWorkspaceReadyPromise,
    notifyWebviewReady: () => source._analyzer?.registry?.notifyWebviewReady(),
    getInteractionPluginApi: pluginId =>
      source._analyzer?.registry?.getPluginAPI(pluginId) as
        | GraphViewInteractionPluginApi
        | undefined,
    getContextMenuPluginApi: pluginId =>
      source._analyzer?.registry?.getPluginAPI(pluginId) as
        | GraphViewContextMenuPluginApi
        | undefined,
    getExporterPluginApi: pluginId =>
      source._analyzer?.registry?.getPluginAPI(pluginId) as
        | GraphViewExporterPluginApi
        | undefined,
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
