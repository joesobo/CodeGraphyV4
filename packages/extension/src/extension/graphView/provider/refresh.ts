import type { IGraphData } from '../../../shared/graph/types';
import type { IPluginStatus } from '../../../shared/plugins/status';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import { getCodeGraphyConfiguration } from '../../repoSettings/current';
import { shouldRebuildGraphView } from '../rebuild';
import { rebuildGraphViewData, smartRebuildGraphView } from '../view/rebuild';

interface GraphViewProviderRefreshAnalyzerLike {
  rebuildGraph(
    disabledSources: Set<string>,
    disabledPlugins: Set<string>,
    showOrphans: boolean,
  ): IGraphData;
  getPluginStatuses(
    disabledSources: Set<string>,
    disabledPlugins: Set<string>,
  ): readonly IPluginStatus[];
  registry: {
    notifyGraphRebuild(graphData: IGraphData): void;
  };
  clearCache(): void;
}

export interface GraphViewProviderRefreshMethodsSource {
  _analyzer: GraphViewProviderRefreshAnalyzerLike | undefined;
  _disabledSources: Set<string>;
  _disabledPlugins: Set<string>;
  _rawGraphData: IGraphData;
  _graphData: IGraphData;
  _loadDisabledRulesAndPlugins(): boolean;
  _loadGroupsAndFilterPatterns(): void;
  _analyzeAndSendData(): Promise<void>;
  _sendAllSettings(): void;
  _sendFavorites(): void;
  _sendGroupsUpdated(): void;
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
  refreshGroupSettings(): void;
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
  shouldRebuild(statuses: readonly IPluginStatus[], kind: 'rule' | 'plugin', id: string): boolean;
}

const DEFAULT_DEPENDENCIES: GraphViewProviderRefreshMethodDependencies = {
  getShowOrphans: () =>
    getCodeGraphyConfiguration().get<boolean>('showOrphans', true),
  rebuildGraphData: rebuildGraphViewData,
  smartRebuildGraphData: smartRebuildGraphView,
  shouldRebuild: shouldRebuildGraphView,
};

export function createGraphViewProviderRefreshMethods(
  source: GraphViewProviderRefreshMethodsSource,
  dependencies: GraphViewProviderRefreshMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderRefreshMethods {
  const _rebuildAndSend = (): void => {
    dependencies.rebuildGraphData(source, {
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
    dependencies.smartRebuildGraphData(source, kind, id, {
      shouldRebuild: (statuses, nextKind, nextId) =>
        dependencies.shouldRebuild(statuses, nextKind, nextId),
      rebuildAndSend: () => runRebuildAndSend(),
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
    });
  };

  const refresh = async (): Promise<void> => {
    source._loadDisabledRulesAndPlugins();
    source._loadGroupsAndFilterPatterns();
    await source._analyzeAndSendData();
    source._sendAllSettings();
    source._sendFavorites();
  };

  const refreshPhysicsSettings = (): void => {
    source._sendPhysicsSettings();
  };

  const refreshGroupSettings = (): void => {
    source._loadGroupsAndFilterPatterns();
    source._sendGroupsUpdated();
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
    refreshGroupSettings,
    refreshPhysicsSettings,
    refreshSettings,
    refreshToggleSettings,
    clearCacheAndRefresh,
    _rebuildAndSend,
    _smartRebuild,
  };

  return methods;
}
