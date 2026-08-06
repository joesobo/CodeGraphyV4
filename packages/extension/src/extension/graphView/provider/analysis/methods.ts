import type { IGraphData } from '../../../../shared/graph/contracts';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { GraphViewIndexingProgress } from '../../analysis/execution';
import type { GraphViewProviderAnalysisState } from '../../analysis/lifecycle';
import { createGraphViewProviderAnalysisDelegates } from './delegates';
import {
  createGraphViewProviderWorkspaceReadyState,
  syncGraphViewProviderWorkspaceReadyState,
} from './state';
import { createGraphViewProviderDoAnalyzeAndSendData } from './execution';
import { createGraphViewProviderAnalyzeAndSendData } from './request';
import {
  createFullIndexAnalysisCoordinator,
} from './fullIndex';
import {
  createDefaultGraphViewProviderAnalysisMethodDependencies,
  type GraphViewProviderAnalysisMethodDependencies,
} from './methods/dependencies';

export {
  createDefaultGraphViewProviderAnalysisMethodDependencies,
  type GraphViewProviderAnalysisMethodDependencies,
} from './methods/dependencies';

export interface GraphViewProviderWorkspaceReadyRegistryLike {
  notifyWorkspaceReady(
    graphData: IGraphData,
    disabledPlugins?: ReadonlySet<string>,
  ): void;
}

interface GraphViewProviderAnalysisAnalyzerLike {
  registry?: GraphViewProviderWorkspaceReadyRegistryLike;
  getFilterExcludedFileCount?(): number;
}

export interface GraphViewProviderAnalysisMethodsSource {
  _analysisController?: AbortController;
  _analysisRequestId: number;
  _analyzer?: GraphViewProviderAnalysisState['analyzer'] & GraphViewProviderAnalysisAnalyzerLike;
  _analyzerInitialized: boolean;
  _analyzerInitPromise?: Promise<void>;
  _installedPluginActivationPromise?: Promise<void>;
  _filterPatterns: string[];
  _disabledPlugins: Set<string>;
  _graphData: IGraphData;
  _rawGraphData: IGraphData;
  _firstAnalysis: boolean;
  _resolveFirstWorkspaceReady?: () => void;
  _firstWorkspaceReadyPromise?: Promise<void>;
  _sendMessage(message: ExtensionToWebviewMessage): void;
  _sendDepthState(): void;
  _computeMergedGroups(): void;
  _sendGroupsUpdated(): void;
  _updateViewContext(): void;
  _applyViewTransform(): void;
  _sendPluginStatuses(): void;
  _sendDecorations(): void;
  _sendPluginWebviewInjections?(): void;
  _loadAndSendData?(this: void): Promise<void>;
  _doLoadAndSendData?(this: void, signal: AbortSignal, requestId: number): Promise<void>;
  _markWorkspaceReady?(
    this: void,
    graph: IGraphData,
    disabledPlugins?: ReadonlySet<string>,
  ): void;
  _isAnalysisStale?(this: void, signal: AbortSignal, requestId: number): boolean;
  _isAbortError?(this: void, error: unknown): boolean;
}

export interface GraphViewProviderAnalysisMethods {
  _loadAndSendData(): Promise<void>;
  _indexAndSendData(): Promise<void>;
  _updateChangedFilesAndSendData(
    filePaths: readonly string[],
    signal?: AbortSignal,
    onProgress?: (progress: GraphViewIndexingProgress) => void,
  ): Promise<void>;
  _refreshAndSendData(): Promise<void>;
  _refreshIndexStatus(): void;
  _doLoadAndSendData(signal: AbortSignal, requestId: number): Promise<void>;
  _markWorkspaceReady(graph: IGraphData, disabledPlugins?: ReadonlySet<string>): void;
  _isAnalysisStale(signal: AbortSignal, requestId: number): boolean;
  _isAbortError(error: unknown): boolean;
}

export function createGraphViewProviderAnalysisMethods(
  source: GraphViewProviderAnalysisMethodsSource,
  dependencies: GraphViewProviderAnalysisMethodDependencies =
    createDefaultGraphViewProviderAnalysisMethodDependencies(),
): GraphViewProviderAnalysisMethods {
  const fullIndexAnalysis = createFullIndexAnalysisCoordinator();

  const _markWorkspaceReady = (
    graph: IGraphData,
    disabledPlugins: ReadonlySet<string> = source._disabledPlugins,
  ): void => {
    const state = createGraphViewProviderWorkspaceReadyState(source);

    dependencies.markWorkspaceReady(
      state,
      source._analyzer?.registry,
      graph,
      disabledPlugins,
    );

    syncGraphViewProviderWorkspaceReadyState(source, state);
  };

  const _isAnalysisStale = (signal: AbortSignal, requestId: number): boolean =>
    dependencies.isAnalysisStale(signal, requestId, source._analysisRequestId);

  const _isAbortError = (error: unknown): boolean => dependencies.isAbortError(error);

  const delegates = createGraphViewProviderAnalysisDelegates(source, {
    markWorkspaceReady: (graph, disabledPlugins) => _markWorkspaceReady(graph, disabledPlugins),
    isAnalysisStale: (signal, requestId) => _isAnalysisStale(signal, requestId),
    isAbortError: error => _isAbortError(error),
  });
  const _doLoadAndSendData = createGraphViewProviderDoAnalyzeAndSendData(
    source,
    dependencies,
    delegates,
    'load',
  );
  const _loadAndSendData = createGraphViewProviderAnalyzeAndSendData(
    source,
    dependencies,
    delegates,
    _doLoadAndSendData,
    'load',
  );
  const _doIndexAndSendData = createGraphViewProviderDoAnalyzeAndSendData(
    source,
    dependencies,
    delegates,
    'index',
  );
  const _indexAndSendData = createGraphViewProviderAnalyzeAndSendData(
    source,
    dependencies,
    delegates,
    _doIndexAndSendData,
    'index',
  );
  const _doUpdateChangedFilesAndSendData = createGraphViewProviderDoAnalyzeAndSendData(
    source,
    dependencies,
    delegates,
    'incremental',
  );
  const _updateChangedFilesAndSendData = createGraphViewProviderAnalyzeAndSendData(
    source,
    dependencies,
    delegates,
    _doUpdateChangedFilesAndSendData,
    'incremental',
  );
  const _doRefreshAndSendData = createGraphViewProviderDoAnalyzeAndSendData(
    source,
    dependencies,
    delegates,
    'refresh',
  );
  const _refreshAndSendData = createGraphViewProviderAnalyzeAndSendData(
    source,
    dependencies,
    delegates,
    _doRefreshAndSendData,
    'refresh',
  );
  let incrementalUpdateTail: Promise<void> = Promise.resolve();
  const enqueueChangedFilesUpdate = (
    filePaths: readonly string[],
    signal?: AbortSignal,
    onProgress?: (progress: GraphViewIndexingProgress) => void,
  ): Promise<void> => {
    if (source._analyzer?.hasIndex?.() === false) {
      return Promise.resolve();
    }

    const update = incrementalUpdateTail.then(async () => {
      await fullIndexAnalysis.waitForFullIndexAnalysis();
      if (signal?.aborted) return;

      const abortUpdate = (): void => {
        source._analysisController?.abort();
      };
      signal?.addEventListener('abort', abortUpdate, { once: true });
      try {
        const activeUpdate = _updateChangedFilesAndSendData(filePaths, onProgress);
        if (signal?.aborted) abortUpdate();
        await activeUpdate;
      } finally {
        signal?.removeEventListener('abort', abortUpdate);
      }
    });
    incrementalUpdateTail = update.catch(() => undefined);
    return update;
  };

  const methods: GraphViewProviderAnalysisMethods = {
    _loadAndSendData: async () => {
      await incrementalUpdateTail;
      if (await fullIndexAnalysis.waitForFullIndexAnalysis()) {
        return;
      }

      await _loadAndSendData();
    },
    _indexAndSendData: () => fullIndexAnalysis.runFullIndexAnalysis(_indexAndSendData),
    _updateChangedFilesAndSendData: enqueueChangedFilesUpdate,
    _refreshAndSendData: () => fullIndexAnalysis.runFullIndexAnalysis(_refreshAndSendData),
    _refreshIndexStatus: () => {
      const hasIndex = source._analyzer?.hasIndex() ?? false;
      const status = source._analyzer?.getIndexStatus?.() ?? {
        freshness: hasIndex ? 'fresh' as const : 'missing' as const,
        detail: hasIndex
          ? 'CodeGraphy index is fresh.'
          : 'CodeGraphy index is missing. Index the workspace to build the graph.',
      };
      source._sendMessage({
        type: 'GRAPH_INDEX_STATUS_UPDATED',
        payload: { hasIndex, freshness: status.freshness, detail: status.detail },
      });
    },
    _doLoadAndSendData,
    _markWorkspaceReady,
    _isAnalysisStale,
    _isAbortError,
  };

  return methods;
}
