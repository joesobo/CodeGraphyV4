import * as vscode from 'vscode';
import type { IGraphData } from '../../../../shared/graph/types';
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
import { createGraphViewProviderAnalysisDelegates } from './delegates';
import {
  createGraphViewProviderWorkspaceReadyState,
  syncGraphViewProviderWorkspaceReadyState,
} from './state';
import { createGraphViewProviderDoAnalyzeAndSendData } from './execution';
import { createGraphViewProviderAnalyzeAndSendData } from './request';

interface GraphViewProviderWorkspaceReadyRegistryLike {
  notifyWorkspaceReady(graphData: IGraphData): void;
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
  _disabledSources: Set<string>;
  _disabledPlugins: Set<string>;
  _graphData: IGraphData;
  _rawGraphData: IGraphData;
  _firstAnalysis: boolean;
  _resolveFirstWorkspaceReady?: () => void;
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
  _loadAndSendData?(this: void): Promise<void>;
  _doAnalyzeAndSendData?(this: void, signal: AbortSignal, requestId: number): Promise<void>;
  _markWorkspaceReady?(this: void, graph: IGraphData): void;
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
  _markWorkspaceReady(graph: IGraphData): void;
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
  ) => void;
  isAnalysisStale: (
    signal: AbortSignal,
    requestId: number,
    currentRequestId: number,
  ) => boolean;
  isAbortError(error: unknown): boolean;
  hasWorkspace(): boolean;
  logError(message: string, error: unknown): void;
}

export function createDefaultGraphViewProviderAnalysisMethodDependencies(): GraphViewProviderAnalysisMethodDependencies {
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
  };
}

export function createGraphViewProviderAnalysisMethods(
  source: GraphViewProviderAnalysisMethodsSource,
  dependencies: GraphViewProviderAnalysisMethodDependencies =
    createDefaultGraphViewProviderAnalysisMethodDependencies(),
): GraphViewProviderAnalysisMethods {
  const _markWorkspaceReady = (graph: IGraphData): void => {
    const state = createGraphViewProviderWorkspaceReadyState(source);

    dependencies.markWorkspaceReady(state, source._analyzer?.registry, graph);

    syncGraphViewProviderWorkspaceReadyState(source, state);
  };

  const _isAnalysisStale = (signal: AbortSignal, requestId: number): boolean =>
    dependencies.isAnalysisStale(signal, requestId, source._analysisRequestId);

  const _isAbortError = (error: unknown): boolean => dependencies.isAbortError(error);

  const delegates = createGraphViewProviderAnalysisDelegates(source, {
    markWorkspaceReady: graph => _markWorkspaceReady(graph),
    isAnalysisStale: (signal, requestId) => _isAnalysisStale(signal, requestId),
    isAbortError: error => _isAbortError(error),
  });
  const _doLoadAndSendData = createGraphViewProviderDoAnalyzeAndSendData(
    source,
    dependencies,
    delegates,
    'load',
  );
  const _doAnalyzeAndSendData = createGraphViewProviderDoAnalyzeAndSendData(
    source,
    dependencies,
    delegates,
    'analyze',
  );
  const _loadAndSendData = createGraphViewProviderAnalyzeAndSendData(
    source,
    dependencies,
    delegates,
    _doLoadAndSendData,
    'load',
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
    _loadAndSendData,
    _indexAndSendData,
    _analyzeAndSendData,
    _refreshAndSendData,
    _incrementalAnalyzeAndSendData,
    _doAnalyzeAndSendData,
    _markWorkspaceReady,
    _isAnalysisStale,
    _isAbortError,
  };

  return methods;
}
