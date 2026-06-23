import type { IGraphData } from '../../../shared/graph/contracts';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import { recordExtensionPerformanceEvent } from '../../performance/marks';
import { getCodeGraphyConfiguration } from '../../repoSettings/current';
import { createGraphViewIndexProgressCoalescer } from '../analysis/execution/progress';
import { rebuildGraphViewData, smartRebuildGraphView } from '../view/rebuild';
import { createRebuildSenders } from './refresh/rebuild';
import { runChangedFileRefresh, runIndexRefresh, runPrimaryRefresh, sendRefreshState } from './refresh/run';

type GraphViewScopedRefreshProgress = { phase: string; current: number; total: number };

interface GraphViewProviderRefreshAnalyzerLike {
  hasIndex(): boolean;
  rebuildGraph(
    disabledPlugins: Set<string>,
    showOrphans: boolean,
  ): IGraphData;
  registry: {
    notifyGraphRebuild(
      graphData: IGraphData,
      disabledPlugins?: ReadonlySet<string>,
    ): void;
  };
  clearCache(): void;
  refreshAnalysisScope?(
    filterPatterns?: string[],
    disabledPlugins?: Set<string>,
    signal?: AbortSignal,
    onProgress?: (progress: GraphViewScopedRefreshProgress) => void,
  ): Promise<IGraphData>;
  refreshPluginFiles?(
    pluginIds: readonly string[],
    filterPatterns?: string[],
    disabledPlugins?: Set<string>,
    signal?: AbortSignal,
    onProgress?: (progress: GraphViewScopedRefreshProgress) => void,
  ): Promise<IGraphData>;
  refreshGitignoreMetadata?(
    filterPatterns?: string[],
    disabledPlugins?: Set<string>,
    signal?: AbortSignal,
  ): Promise<IGraphData>;
}

interface RefreshCoordinatorState {
  indexRefreshPromise: Promise<void> | undefined;
  queuedChangedFilePaths: Set<string>;
}

interface ScopedRefreshLifecycle {
  setController(controller: AbortController): void;
  clearController(controller: AbortController): void;
  abort(): void;
}

export interface GraphViewProviderRefreshMethodsSource {
  _analyzer: GraphViewProviderRefreshAnalyzerLike | undefined;
  _analysisController?: AbortController;
  _analysisRequestId: number;
  _disabledPlugins: Set<string>;
  _filterPatterns: string[];
  _rawGraphData: IGraphData;
  _graphData: IGraphData;
  _loadDisabledRulesAndPlugins(): boolean;
  _loadGroupsAndFilterPatterns(): void;
  _loadAndSendData?(): Promise<void>;
  _analyzeAndSendData(): Promise<void>;
  _refreshAndSendData?(): Promise<void>;
  _incrementalAnalyzeAndSendData?(filePaths: readonly string[]): Promise<void>;
  _sendAllSettings(): void;
  _sendFavorites(favorites?: string[]): void;
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
  refreshGitignoreMetadata(): Promise<void>;
  refreshAnalysisScope(): Promise<void>;
  refreshPluginFiles(pluginIds: readonly string[]): Promise<void>;
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

function isScopedRefreshStale(
  source: GraphViewProviderRefreshMethodsSource,
  signal: AbortSignal,
  requestId: number,
): boolean {
  return signal.aborted || source._analysisRequestId !== requestId;
}

async function runScopedRefreshRequest(
  source: GraphViewProviderRefreshMethodsSource,
  runRefresh: (
    signal: AbortSignal,
    onProgress: (progress: GraphViewScopedRefreshProgress) => void,
  ) => Promise<IGraphData>,
  lifecycle: {
    setController(controller: AbortController): void;
    clearController(controller: AbortController): void;
  },
): Promise<IGraphData | undefined> {
  source._analysisController?.abort();
  const controller = new AbortController();
  source._analysisController = controller;
  lifecycle.setController(controller);
  const requestId = ++source._analysisRequestId;

  const sendProgress = createGraphViewIndexProgressCoalescer((progress: GraphViewScopedRefreshProgress) => {
    if (isScopedRefreshStale(source, controller.signal, requestId)) {
      return;
    }
    source._sendMessage({ type: 'GRAPH_INDEX_PROGRESS', payload: progress });
  });

  try {
    const graphData = await runRefresh(controller.signal, sendProgress);
    if (isScopedRefreshStale(source, controller.signal, requestId)) {
      return undefined;
    }
    return graphData;
  } catch (error) {
    if (isScopedRefreshStale(source, controller.signal, requestId)) {
      return undefined;
    }
    throw error;
  } finally {
    lifecycle.clearController(controller);
    if (source._analysisController === controller) {
      source._analysisController = undefined;
    }
  }
}

function publishScopedRefreshGraphData(
  source: GraphViewProviderRefreshMethodsSource,
  graphData: IGraphData,
): void {
  source._rawGraphData = graphData;
  source._updateViewContext();
  source._applyViewTransform();
  source._computeMergedGroups();
  source._sendGroupsUpdated();
  source._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: source._graphData });
  source._sendDepthState();
  source._sendGraphControls?.();
  source._sendPluginStatuses();
  source._sendDecorations();
  source._analyzer?.registry.notifyGraphRebuild(source._graphData, source._disabledPlugins);
}

function createScopedRefreshLifecycle(): ScopedRefreshLifecycle {
  let scopedRefreshController: AbortController | undefined;

  return {
    setController(controller: AbortController): void {
      scopedRefreshController = controller;
    },
    clearController(controller: AbortController): void {
      if (scopedRefreshController === controller) {
        scopedRefreshController = undefined;
      }
    },
    abort(): void {
      scopedRefreshController?.abort();
    },
  };
}

function createRefreshCoordinatorState(): RefreshCoordinatorState {
  return {
    indexRefreshPromise: undefined,
    queuedChangedFilePaths: new Set<string>(),
  };
}

function prepareRefreshInputs(source: GraphViewProviderRefreshMethodsSource): void {
  source._loadDisabledRulesAndPlugins();
  source._loadGroupsAndFilterPatterns();
}

function canRunIndexedChangedFileRefresh(source: GraphViewProviderRefreshMethodsSource): boolean {
  return source._analyzer?.hasIndex() === true && source._incrementalAnalyzeAndSendData !== undefined;
}

function createRefreshMethod(
  source: GraphViewProviderRefreshMethodsSource,
  state: RefreshCoordinatorState,
): () => Promise<void> {
  return async (): Promise<void> => {
    if (state.indexRefreshPromise) {
      await state.indexRefreshPromise;
      return;
    }

    prepareRefreshInputs(source);
    await runPrimaryRefresh(source);
    sendRefreshState(source, 'refresh');
  };
}

function createRefreshIndexMethod(
  source: GraphViewProviderRefreshMethodsSource,
  state: RefreshCoordinatorState,
  refreshChangedFiles: (filePaths: readonly string[]) => Promise<void>,
): () => Promise<void> {
  return async (): Promise<void> => {
    if (state.indexRefreshPromise) {
      await state.indexRefreshPromise;
      return;
    }

    state.indexRefreshPromise = (async (): Promise<void> => {
      prepareRefreshInputs(source);
      await runIndexRefresh(source);
      sendRefreshState(source, 'refreshIndex');
    })();

    try {
      await state.indexRefreshPromise;
    } finally {
      state.indexRefreshPromise = undefined;
    }

    const queuedFilePaths = [...state.queuedChangedFilePaths];
    state.queuedChangedFilePaths = new Set<string>();
    if (queuedFilePaths.length > 0) {
      await refreshChangedFiles(queuedFilePaths);
    }
  };
}

function createRefreshAnalysisScopeMethod(
  source: GraphViewProviderRefreshMethodsSource,
  state: RefreshCoordinatorState,
  refresh: () => Promise<void>,
  scopedRefreshLifecycle: ScopedRefreshLifecycle,
): () => Promise<void> {
  return async (): Promise<void> => {
    if (state.indexRefreshPromise) {
      await state.indexRefreshPromise;
    }

    prepareRefreshInputs(source);
    if (!source._analyzer?.hasIndex() || !source._analyzer.refreshAnalysisScope) {
      await refresh();
      return;
    }

    const graphData = await runScopedRefreshRequest(
      source,
      (signal, onProgress) => source._analyzer!.refreshAnalysisScope!(
        source._filterPatterns,
        source._disabledPlugins,
        signal,
        onProgress,
      ),
      scopedRefreshLifecycle,
    );
    publishGraphDataIfPresent(source, graphData, 'analysisScope');
  };
}

function createRefreshGitignoreMetadataMethod(
  source: GraphViewProviderRefreshMethodsSource,
  state: RefreshCoordinatorState,
  refreshIndex: () => Promise<void>,
  scopedRefreshLifecycle: ScopedRefreshLifecycle,
): () => Promise<void> {
  return async (): Promise<void> => {
    if (state.indexRefreshPromise) {
      await state.indexRefreshPromise;
    }

    prepareRefreshInputs(source);
    if (!source._analyzer?.refreshGitignoreMetadata) {
      await refreshIndex();
      return;
    }

    const graphData = await runScopedRefreshRequest(
      source,
      signal => source._analyzer!.refreshGitignoreMetadata!(
        source._filterPatterns,
        source._disabledPlugins,
        signal,
      ),
      scopedRefreshLifecycle,
    );
    publishGraphDataIfPresent(source, graphData, 'gitignoreMetadata');
  };
}

function createRefreshPluginFilesMethod(
  source: GraphViewProviderRefreshMethodsSource,
  state: RefreshCoordinatorState,
  refresh: () => Promise<void>,
  scopedRefreshLifecycle: ScopedRefreshLifecycle,
): (pluginIds: readonly string[]) => Promise<void> {
  return async (pluginIds: readonly string[]): Promise<void> => {
    if (state.indexRefreshPromise) {
      await state.indexRefreshPromise;
    }

    prepareRefreshInputs(source);
    if (!source._analyzer?.refreshPluginFiles) {
      await refresh();
      return;
    }

    const graphData = await runScopedRefreshRequest(
      source,
      (signal, onProgress) => source._analyzer!.refreshPluginFiles!(
        pluginIds,
        source._filterPatterns,
        source._disabledPlugins,
        signal,
        onProgress,
      ),
      scopedRefreshLifecycle,
    );
    publishGraphDataIfPresent(source, graphData, 'pluginFiles');
  };
}

function publishGraphDataIfPresent(
  source: GraphViewProviderRefreshMethodsSource,
  graphData: IGraphData | undefined,
  reason: 'analysisScope' | 'gitignoreMetadata' | 'pluginFiles',
): void {
  if (!graphData) {
    return;
  }

  publishScopedRefreshGraphData(source, graphData);
  sendRefreshState(source, reason);
}

function createRefreshChangedFilesMethod(
  source: GraphViewProviderRefreshMethodsSource,
  state: RefreshCoordinatorState,
): (filePaths: readonly string[]) => Promise<void> {
  return async (filePaths: readonly string[]): Promise<void> => {
    recordExtensionPerformanceEvent('graphView.refreshChangedFiles.received', {
      fileCount: filePaths.length,
      indexRefreshInFlight: state.indexRefreshPromise !== undefined,
    });
    if (state.indexRefreshPromise) {
      state.queuedChangedFilePaths = new Set([
        ...state.queuedChangedFilePaths,
        ...filePaths,
      ]);
      return;
    }

    if (!canRunIndexedChangedFileRefresh(source)) {
      prepareRefreshInputs(source);
    }
    const refreshMode = await runChangedFileRefresh(source, filePaths);
    if (refreshMode !== 'incremental') {
      sendRefreshState(source, 'changedFiles');
    }
  };
}

export function createGraphViewProviderRefreshMethods(
  source: GraphViewProviderRefreshMethodsSource,
  dependencies: GraphViewProviderRefreshMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderRefreshMethods {
  const rebuildSenders = createRebuildSenders(source, dependencies);
  const _rebuildAndSend = (): void => rebuildSenders.rebuildAndSend();
  const scopedRefreshLifecycle = createScopedRefreshLifecycle();
  const _smartRebuild = (id: string): void => {
    scopedRefreshLifecycle.abort();
    rebuildSenders.smartRebuild(id);
  };
  // Full reindex clears the persisted cache first, so competing refreshes
  // must wait or they can rebuild from an empty intermediate index.
  const state = createRefreshCoordinatorState();
  const refresh = createRefreshMethod(source, state);
  const refreshChangedFiles = createRefreshChangedFilesMethod(source, state);
  const refreshIndex = createRefreshIndexMethod(source, state, refreshChangedFiles);
  const refreshAnalysisScope = createRefreshAnalysisScopeMethod(
    source,
    state,
    refresh,
    scopedRefreshLifecycle,
  );
  const refreshGitignoreMetadata = createRefreshGitignoreMetadataMethod(
    source,
    state,
    refreshIndex,
    scopedRefreshLifecycle,
  );
  const refreshPluginFiles = createRefreshPluginFilesMethod(
    source,
    state,
    refresh,
    scopedRefreshLifecycle,
  );

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
    scopedRefreshLifecycle.abort();
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

  const methods: GraphViewProviderRefreshMethods = {
    refresh,
    refreshIndex,
    refreshGitignoreMetadata,
    refreshAnalysisScope,
    refreshPluginFiles,
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
