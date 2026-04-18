import type { IGraphData } from '../../../shared/graph/contracts';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import { getCodeGraphyConfiguration } from '../../repoSettings/current';
import { rebuildGraphViewData, smartRebuildGraphView } from '../view/rebuild';
import { createRebuildSenders } from './refresh/rebuild';
import { runChangedFileRefresh, runIndexRefresh, runPrimaryRefresh, sendRefreshState } from './refresh/run';

interface GraphViewProviderRefreshAnalyzerLike {
  hasIndex(): boolean;
  rebuildGraph(
    disabledPlugins: Set<string>,
    showOrphans: boolean,
  ): IGraphData;
  registry: {
    notifyGraphRebuild(graphData: IGraphData): void;
  };
  clearCache(): void;
}

export interface GraphViewProviderRefreshMethodsSource {
  _analyzer: GraphViewProviderRefreshAnalyzerLike | undefined;
  _disabledPlugins: Set<string>;
  _rawGraphData: IGraphData;
  _graphData: IGraphData;
  _loadDisabledRulesAndPlugins(): boolean;
  _loadGroupsAndFilterPatterns(): void;
  _loadAndSendData?(): Promise<void>;
  _analyzeAndSendData(): Promise<void>;
  _refreshAndSendData?(): Promise<void>;
  _incrementalAnalyzeAndSendData?(filePaths: readonly string[]): Promise<void>;
  _sendAllSettings(): void;
  _sendFavorites(): void;
  _computeMergedGroups(): void;
  _sendGroupsUpdated(): void;
  _sendGraphControls?(): void;
  _sendSettings(): void;
  _sendPhysicsSettings(): void;
  _updateViewContext(): void;
  _applyViewTransform(): void;
  _sendDepthState(): void;
  _sendPluginStatuses(): void;
  _sendDecorations(): void;
  _sendMessage(message: ExtensionToWebviewMessage): void;
  _rebuildAndSend?(this: void): void;
}

export interface GraphViewProviderRefreshMethods {
  refresh(): Promise<void>;
  refreshIndex(): Promise<void>;
  refreshChangedFiles(filePaths: readonly string[]): Promise<void>;
  refreshGroupSettings(): void;
  refreshPhysicsSettings(): void;
  refreshSettings(): void;
  refreshToggleSettings(): void;
  clearCacheAndRefresh(): Promise<void>;
  _rebuildAndSend(): void;
  _smartRebuild(id: string): void;
}

export interface GraphViewProviderRefreshMethodDependencies {
  getShowOrphans(): boolean;
  rebuildGraphData: typeof rebuildGraphViewData;
  smartRebuildGraphData: typeof smartRebuildGraphView;
}

export const DEFAULT_DEPENDENCIES: GraphViewProviderRefreshMethodDependencies = {
  getShowOrphans: () =>
    getCodeGraphyConfiguration().get<boolean>('showOrphans', true),
  rebuildGraphData: rebuildGraphViewData,
  smartRebuildGraphData: smartRebuildGraphView,
};

export function createGraphViewProviderRefreshMethods(
  source: GraphViewProviderRefreshMethodsSource,
  dependencies: GraphViewProviderRefreshMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderRefreshMethods {
  const rebuildSenders = createRebuildSenders(source, dependencies);
  const _rebuildAndSend = (): void => rebuildSenders.rebuildAndSend();
  const _smartRebuild = (id: string): void => rebuildSenders.smartRebuild(id);

  const refresh = async (): Promise<void> => {
    source._loadDisabledRulesAndPlugins();
    source._loadGroupsAndFilterPatterns();
    await runPrimaryRefresh(source);
    sendRefreshState(source);
  };

  const refreshIndex = async (): Promise<void> => {
    source._loadDisabledRulesAndPlugins();
    source._loadGroupsAndFilterPatterns();
    await runIndexRefresh(source);
    sendRefreshState(source);
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
    source._sendGraphControls?.();
  };

  const refreshToggleSettings = (): void => {
    if (!source._loadDisabledRulesAndPlugins()) return;
    if (source._rebuildAndSend) {
      source._rebuildAndSend();
      return;
    }

    _rebuildAndSend();
  };

  const clearCacheAndRefresh = async (): Promise<void> => {
    source._analyzer?.clearCache();
    await refreshIndex();
  };

  const refreshChangedFiles = async (filePaths: readonly string[]): Promise<void> => {
    source._loadDisabledRulesAndPlugins();
    source._loadGroupsAndFilterPatterns();
    await runChangedFileRefresh(source, filePaths);
    sendRefreshState(source);
  };

  const methods: GraphViewProviderRefreshMethods = {
    refresh,
    refreshIndex,
    refreshChangedFiles,
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
