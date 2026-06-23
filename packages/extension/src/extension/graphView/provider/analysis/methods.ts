import * as vscode from 'vscode';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import {
  executeGraphViewProviderAnalysis,
  isGraphViewAbortError,
  isGraphViewAnalysisStale,
  markGraphViewWorkspaceReady,
  runGraphViewProviderAnalysisRequest,
  type GraphViewProviderAnalysisHandlers,
  type GraphViewProviderAnalysisRequestHandlers,
  type GraphViewProviderAnalysisState,
} from '../../analysis/lifecycle';
import type { DiagnosticEventInput } from '@codegraphy-dev/core';
import { getCodeGraphyConfiguration } from '../../../repoSettings/current';
import { createExtensionDiagnosticLogger } from '../../../diagnostics/logger';
import { createGraphViewProviderAnalysisDelegates } from './delegates';
import {
  createGraphViewProviderWorkspaceReadyState,
  syncGraphViewProviderWorkspaceReadyState,
} from './state';
import { createGraphViewProviderDoAnalyzeAndSendData } from './execution';
import { createGraphViewProviderAnalyzeAndSendData } from './request';
import {
  canReplayStaleCache,
  createFullIndexAnalysisCoordinator,
} from './fullIndex';

interface GraphViewProviderWorkspaceReadyRegistryLike {
  notifyWorkspaceReady(
    graphData: IGraphData,
    disabledPlugins?: ReadonlySet<string>,
  ): void;
}

interface GraphViewProviderAnalysisAnalyzerLike {
  registry?: GraphViewProviderWorkspaceReadyRegistryLike;
}

export interface GraphViewProviderAnalysisMethodsSource {
  _analysisController?: AbortController;
  _analysisRequestId: number;
  _changedFilePaths?: string[];
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
  _sendContextMenuItems(): void;
  _sendPluginExporters?(): void;
  _sendPluginToolbarActions?(): void;
  _sendGraphViewContributionStatuses?(): void;
  _sendPluginWebviewInjections?(): void;
  _loadAndSendData?(this: void): Promise<void>;
  _doAnalyzeAndSendData?(this: void, signal: AbortSignal, requestId: number): Promise<void>;
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
  _analyzeAndSendData(): Promise<void>;
  _refreshAndSendData(): Promise<void>;
  _incrementalAnalyzeAndSendData(filePaths: readonly string[]): Promise<void>;
  _doAnalyzeAndSendData(signal: AbortSignal, requestId: number): Promise<void>;
  _markWorkspaceReady(graph: IGraphData, disabledPlugins?: ReadonlySet<string>): void;
  _isAnalysisStale(signal: AbortSignal, requestId: number): boolean;
  _isAbortError(error: unknown): boolean;
}

export interface GraphViewProviderAnalysisMethodDependencies {
  runAnalysisRequest: (
    state: GraphViewProviderAnalysisState,
    handlers: GraphViewProviderAnalysisRequestHandlers,
  ) => Promise<void>;
  executeAnalysis: (
    signal: AbortSignal,
    requestId: number,
    state: GraphViewProviderAnalysisState,
    handlers: GraphViewProviderAnalysisHandlers,
  ) => Promise<void>;
  markWorkspaceReady: (
    state: {
      firstAnalysis: boolean;
      resolveFirstWorkspaceReady: (() => void) | undefined;
    },
    registry: GraphViewProviderWorkspaceReadyRegistryLike | undefined,
    graphData: IGraphData,
    disabledPlugins?: ReadonlySet<string>,
  ) => void;
  isAnalysisStale: (
    signal: AbortSignal,
    requestId: number,
    currentRequestId: number,
  ) => boolean;
  isAbortError(error: unknown): boolean;
  hasWorkspace(): boolean;
  logError(message: string, error: unknown): void;
  emitDiagnostic?(input: DiagnosticEventInput): void;
}

export function createDefaultGraphViewProviderAnalysisMethodDependencies(): GraphViewProviderAnalysisMethodDependencies {
  const diagnostics = createExtensionDiagnosticLogger({
    isEnabled: () => getCodeGraphyConfiguration().get('verboseDiagnostics', false),
  });

  return {
    runAnalysisRequest: runGraphViewProviderAnalysisRequest,
    executeAnalysis: executeGraphViewProviderAnalysis,
    markWorkspaceReady: markGraphViewWorkspaceReady,
    isAnalysisStale: isGraphViewAnalysisStale,
    isAbortError: isGraphViewAbortError,
    hasWorkspace: () => (vscode.workspace.workspaceFolders?.length ?? 0) > 0,
    logError: (message, error) => {
      console.error(message, error);
    },
    emitDiagnostic: input => diagnostics.emit(input),
  };
}

export function createGraphViewProviderAnalysisMethods(
  source: GraphViewProviderAnalysisMethodsSource,
  dependencies: GraphViewProviderAnalysisMethodDependencies =
    createDefaultGraphViewProviderAnalysisMethodDependencies(),
): GraphViewProviderAnalysisMethods {
  const fullIndexAnalysis = createFullIndexAnalysisCoordinator(dependencies);

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
  const _doAnalyzeAndSendData = createGraphViewProviderDoAnalyzeAndSendData(
    source,
    dependencies,
    delegates,
    'analyze',
  );
  const _analyzeAndSendData = createGraphViewProviderAnalyzeAndSendData(
    source,
    dependencies,
    delegates,
    _doAnalyzeAndSendData,
    'analyze',
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
  const _incrementalAnalyzeAndSendData = async (filePaths: readonly string[]): Promise<void> => {
    await fullIndexAnalysis.waitForForegroundFullIndexAnalysis();
    if (source._firstAnalysis && source._firstWorkspaceReadyPromise) {
      await source._firstWorkspaceReadyPromise;
    }

    source._changedFilePaths = [...filePaths];
    const doIncrementalAnalyzeAndSendData = createGraphViewProviderDoAnalyzeAndSendData(
      source,
      dependencies,
      delegates,
      'incremental',
    );
    const runIncrementalAnalyzeAndSendData = createGraphViewProviderAnalyzeAndSendData(
      source,
      dependencies,
      delegates,
      doIncrementalAnalyzeAndSendData,
      'incremental',
    );

    await runIncrementalAnalyzeAndSendData();
  };

  const methods: GraphViewProviderAnalysisMethods = {
    _loadAndSendData: async () => {
      if (await fullIndexAnalysis.waitForFullIndexAnalysis()) {
        return;
      }

      await _loadAndSendData();
      if (canReplayStaleCache(source)) {
        fullIndexAnalysis.runFullIndexAnalysisInBackground(
          _analyzeAndSendData,
          () => source._analysisController === undefined,
        );
      }
    },
    _indexAndSendData: () => fullIndexAnalysis.runFullIndexAnalysis(_indexAndSendData),
    _analyzeAndSendData: () => fullIndexAnalysis.runAfterFullIndexAnalysis(_analyzeAndSendData),
    _refreshAndSendData: () => fullIndexAnalysis.runFullIndexAnalysis(_refreshAndSendData),
    _incrementalAnalyzeAndSendData,
    _doAnalyzeAndSendData,
    _markWorkspaceReady,
    _isAnalysisStale,
    _isAbortError,
  };

  return methods;
}
