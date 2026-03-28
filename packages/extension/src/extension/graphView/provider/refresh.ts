import * as vscode from 'vscode';
import type { ExtensionToWebviewMessage, IGraphData } from '../../../shared/contracts';
import { shouldRebuildGraphView } from '../rebuild';
import { rebuildGraphViewData, smartRebuildGraphView } from '../view/rebuild';

interface GraphViewProviderRefreshAnalyzerLike {
  clearCache(): void;
}

export interface GraphViewProviderRefreshMethodsSource {
  _analyzer?: GraphViewProviderRefreshAnalyzerLike;
  _disabledRules: Set<string>;
  _disabledPlugins: Set<string>;
  _rawGraphData: IGraphData;
  _graphData: IGraphData;
  _loadDisabledRulesAndPlugins(): boolean;
  _analyzeAndSendData(): Promise<void>;
  _sendSettings(): void;
  _sendPhysicsSettings(): void;
  _updateViewContext(): void;
  _applyViewTransform(): void;
  _sendAvailableViews(): void;
  _sendPluginStatuses(): void;
  _sendDecorations(): void;
  _sendMessage(message: ExtensionToWebviewMessage): void;
  _rebuildAndSend?(this: void): void;
}

export interface GraphViewProviderRefreshMethods {
  refresh(): Promise<void>;
  refreshPhysicsSettings(): void;
  refreshSettings(): void;
  refreshToggleSettings(): void;
  clearCacheAndRefresh(): Promise<void>;
  _rebuildAndSend(): void;
  _smartRebuild(kind: 'rule' | 'plugin', id: string): void;
}

export interface GraphViewProviderRefreshMethodDependencies {
  getShowOrphans(): boolean;
  rebuildGraphData: typeof rebuildGraphViewData;
  smartRebuildGraphData: typeof smartRebuildGraphView;
  shouldRebuild: typeof shouldRebuildGraphView;
}

const DEFAULT_DEPENDENCIES: GraphViewProviderRefreshMethodDependencies = {
  getShowOrphans: () =>
    vscode.workspace.getConfiguration('codegraphy').get<boolean>('showOrphans', true),
  rebuildGraphData: rebuildGraphViewData,
  smartRebuildGraphData: smartRebuildGraphView,
  shouldRebuild: shouldRebuildGraphView,
};

export function createGraphViewProviderRefreshMethods(
  source: GraphViewProviderRefreshMethodsSource,
  dependencies: GraphViewProviderRefreshMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderRefreshMethods {
  const _rebuildAndSend = (): void => {
    dependencies.rebuildGraphData(source as never, {
      getShowOrphans: () => dependencies.getShowOrphans(),
      updateViewContext: () => source._updateViewContext(),
      applyViewTransform: () => source._applyViewTransform(),
      sendAvailableViews: () => source._sendAvailableViews(),
      sendPluginStatuses: () => source._sendPluginStatuses(),
      sendDecorations: () => source._sendDecorations(),
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
    });
  };

  const runRebuildAndSend = (): void => {
    const implementation = source._rebuildAndSend;
    if (implementation) {
      implementation();
      return;
    }

    _rebuildAndSend();
  };

  const _smartRebuild = (kind: 'rule' | 'plugin', id: string): void => {
    dependencies.smartRebuildGraphData(source as never, kind, id, {
      shouldRebuild: (statuses, nextKind, nextId) =>
        dependencies.shouldRebuild(statuses as never, nextKind, nextId),
      rebuildAndSend: () => runRebuildAndSend(),
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
    });
  };

  const refresh = async (): Promise<void> => {
    source._loadDisabledRulesAndPlugins();
    await source._analyzeAndSendData();
    source._sendSettings();
    source._sendPhysicsSettings();
  };

  const refreshPhysicsSettings = (): void => {
    source._sendPhysicsSettings();
  };

  const refreshSettings = (): void => {
    source._sendSettings();
  };

  const refreshToggleSettings = (): void => {
    if (!source._loadDisabledRulesAndPlugins()) return;
    runRebuildAndSend();
  };

  const clearCacheAndRefresh = async (): Promise<void> => {
    source._analyzer?.clearCache();
    await source._analyzeAndSendData();
  };

  const methods: GraphViewProviderRefreshMethods = {
    refresh,
    refreshPhysicsSettings,
    refreshSettings,
    refreshToggleSettings,
    clearCacheAndRefresh,
    _rebuildAndSend,
    _smartRebuild,
  };

  Object.assign(source as object, methods);

  return methods;
}
