import type { IGraphData } from '../../../shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import { getCodeGraphyConfiguration } from '../../repoSettings/current';
import { rebuildGraphViewData, smartRebuildGraphView } from '../view/rebuild';

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

const DEFAULT_DEPENDENCIES: GraphViewProviderRefreshMethodDependencies = {
  getShowOrphans: () =>
    getCodeGraphyConfiguration().get<boolean>('showOrphans', true),
  rebuildGraphData: rebuildGraphViewData,
  smartRebuildGraphData: smartRebuildGraphView,
};

function sendRefreshState(source: GraphViewProviderRefreshMethodsSource): void {
  source._sendAllSettings();
  source._sendGraphControls?.();
  source._sendFavorites();
}

async function runPrimaryRefresh(source: GraphViewProviderRefreshMethodsSource): Promise<void> {
  if (source._loadAndSendData) {
    await source._loadAndSendData();
    return;
  }

  await source._analyzeAndSendData();
}

async function runIndexRefresh(source: GraphViewProviderRefreshMethodsSource): Promise<void> {
  if (source._refreshAndSendData) {
    await source._refreshAndSendData();
    return;
  }

  await source._analyzeAndSendData();
}

async function runChangedFileRefresh(
  source: GraphViewProviderRefreshMethodsSource,
  filePaths: readonly string[],
): Promise<void> {
  if (!source._analyzer?.hasIndex()) {
    await runPrimaryRefresh(source);
    return;
  }

  if (source._incrementalAnalyzeAndSendData) {
    await source._incrementalAnalyzeAndSendData(filePaths);
    return;
  }

  await source._analyzeAndSendData();
}

export function createGraphViewProviderRefreshMethods(
  source: GraphViewProviderRefreshMethodsSource,
  dependencies: GraphViewProviderRefreshMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderRefreshMethods {
  const _rebuildAndSend = (): void => {
    dependencies.rebuildGraphData(source, {
      getShowOrphans: () => dependencies.getShowOrphans(),
      computeMergedGroups: () => source._computeMergedGroups(),
      sendGroupsUpdated: () => source._sendGroupsUpdated(),
      updateViewContext: () => source._updateViewContext(),
      applyViewTransform: () => source._applyViewTransform(),
      sendDepthState: () => source._sendDepthState(),
      sendGraphControls: () => source._sendGraphControls?.(),
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

  const _smartRebuild = (id: string): void => {
    dependencies.smartRebuildGraphData(source, id, {
      rebuildAndSend: () => runRebuildAndSend(),
    });
  };

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
    runRebuildAndSend();
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
