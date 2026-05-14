import type { GraphViewMessageListenerContext } from '../messages/listener';
import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerSource,
} from './listener';
import { createGraphViewProviderPluginApis } from './pluginApis';
import {
  setPluginFilterPatterns,
  setPluginUserGroups,
  setPluginWebviewReadyNotified,
} from './pluginState';
import { createGraphLayoutUpdatedMessage } from '../../graphLayout/message';

type GraphLayoutWebviewSource = GraphViewProviderMessageListenerSource & {
  _view?: { webview: { asWebviewUri(uri: import('vscode').Uri): { toString(): string } } };
  _panels?: ReadonlyArray<{ webview: { asWebviewUri(uri: import('vscode').Uri): { toString(): string } } }>;
};

function createGraphLayoutMessage(
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies,
) {
  const webviewSource = source as GraphLayoutWebviewSource;
  const webview = webviewSource._view?.webview ?? webviewSource._panels?.[0]?.webview;
  return createGraphLayoutUpdatedMessage({
    workspaceFolder: dependencies.workspace.workspaceFolders?.[0],
    asWebviewUri: webview ? uri => webview.asWebviewUri(uri) : undefined,
  });
}

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
  | 'sendGraphLayout'
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
    sendGraphLayout: () => source._sendMessage(createGraphLayoutMessage(source, dependencies)),
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
    setUserGroups: groups => setPluginUserGroups(source, groups),
    setFilterPatterns: patterns => setPluginFilterPatterns(source, patterns),
    setWebviewReadyNotified: readyNotified =>
      setPluginWebviewReadyNotified(source, readyNotified),
  };
}
