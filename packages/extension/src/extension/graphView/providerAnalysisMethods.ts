import * as vscode from 'vscode';
import type { ExtensionToWebviewMessage, IGraphData } from '../../shared/types';
import {
  executeGraphViewProviderAnalysis,
  isGraphViewAbortError,
  isGraphViewAnalysisStale,
  markGraphViewWorkspaceReady,
  runGraphViewProviderAnalysisRequest,
  type GraphViewProviderAnalysisHandlers,
  type GraphViewProviderAnalysisRequestHandlers,
  type GraphViewProviderAnalysisState,
} from './analysisLifecycle';

interface GraphViewProviderWorkspaceReadyRegistryLike {
  notifyWorkspaceReady(graphData: IGraphData): void;
}

interface GraphViewProviderAnalysisAnalyzerLike {
  registry?: GraphViewProviderWorkspaceReadyRegistryLike;
}

export interface GraphViewProviderAnalysisMethodsSource {
  _analysisController?: AbortController;
  _analysisRequestId: number;
  _analyzer?: GraphViewProviderAnalysisState['analyzer'] & GraphViewProviderAnalysisAnalyzerLike;
  _analyzerInitialized: boolean;
  _analyzerInitPromise?: Promise<void>;
  _filterPatterns: string[];
  _disabledRules: Set<string>;
  _disabledPlugins: Set<string>;
  _graphData: IGraphData;
  _rawGraphData: IGraphData;
  _firstAnalysis: boolean;
  _resolveFirstWorkspaceReady?: () => void;
  _sendMessage(message: ExtensionToWebviewMessage): void;
  _sendAvailableViews(): void;
  _computeMergedGroups(): void;
  _sendGroupsUpdated(): void;
  _updateViewContext(): void;
  _applyViewTransform(): void;
  _sendPluginStatuses(): void;
  _sendDecorations(): void;
  _sendContextMenuItems(): void;
  _doAnalyzeAndSendData?(this: void, signal: AbortSignal, requestId: number): Promise<void>;
  _markWorkspaceReady?(this: void, graph: IGraphData): void;
  _isAnalysisStale?(this: void, signal: AbortSignal, requestId: number): boolean;
  _isAbortError?(this: void, error: unknown): boolean;
}

export interface GraphViewProviderAnalysisMethods {
  _analyzeAndSendData(): Promise<void>;
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

const DEFAULT_DEPENDENCIES: GraphViewProviderAnalysisMethodDependencies = {
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

export function createGraphViewProviderAnalysisMethods(
  source: GraphViewProviderAnalysisMethodsSource,
  dependencies: GraphViewProviderAnalysisMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderAnalysisMethods {
  const _markWorkspaceReady = (graph: IGraphData): void => {
    const state = {
      firstAnalysis: source._firstAnalysis,
      resolveFirstWorkspaceReady: source._resolveFirstWorkspaceReady,
    };

    dependencies.markWorkspaceReady(state, source._analyzer?.registry, graph);

    source._firstAnalysis = state.firstAnalysis;
    source._resolveFirstWorkspaceReady = state.resolveFirstWorkspaceReady;
  };

  const _isAnalysisStale = (signal: AbortSignal, requestId: number): boolean =>
    dependencies.isAnalysisStale(signal, requestId, source._analysisRequestId);

  const _isAbortError = (error: unknown): boolean => dependencies.isAbortError(error);

  const callMarkWorkspaceReady = (graph: IGraphData): void => {
    const implementation = source._markWorkspaceReady;
    if (implementation && implementation !== _markWorkspaceReady) {
      implementation(graph);
      return;
    }

    _markWorkspaceReady(graph);
  };

  const callIsAnalysisStale = (signal: AbortSignal, requestId: number): boolean => {
    const implementation = source._isAnalysisStale;
    if (implementation && implementation !== _isAnalysisStale) {
      return implementation(signal, requestId);
    }

    return _isAnalysisStale(signal, requestId);
  };

  const callIsAbortError = (error: unknown): boolean => {
    const implementation = source._isAbortError;
    if (implementation && implementation !== _isAbortError) {
      return implementation(error);
    }

    return _isAbortError(error);
  };

  const _doAnalyzeAndSendData = async (
    signal: AbortSignal,
    requestId: number,
  ): Promise<void> => {
    const state: GraphViewProviderAnalysisState = {
      analysisController: source._analysisController,
      analysisRequestId: source._analysisRequestId,
      analyzer: source._analyzer,
      analyzerInitialized: source._analyzerInitialized,
      analyzerInitPromise: source._analyzerInitPromise,
      filterPatterns: source._filterPatterns,
      disabledRules: source._disabledRules,
      disabledPlugins: source._disabledPlugins,
    };

    await dependencies.executeAnalysis(signal, requestId, state, {
      isAnalysisStale: (nextSignal, nextRequestId) =>
        callIsAnalysisStale(nextSignal, nextRequestId),
      hasWorkspace: () => dependencies.hasWorkspace(),
      setRawGraphData: graphData => {
        source._rawGraphData = graphData;
      },
      setGraphData: graphData => {
        source._graphData = graphData;
      },
      getGraphData: () => source._graphData,
      sendGraphDataUpdated: graphData => {
        source._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: graphData });
      },
      sendAvailableViews: () => source._sendAvailableViews(),
      computeMergedGroups: () => source._computeMergedGroups(),
      sendGroupsUpdated: () => source._sendGroupsUpdated(),
      updateViewContext: () => source._updateViewContext(),
      applyViewTransform: () => source._applyViewTransform(),
      sendPluginStatuses: () => source._sendPluginStatuses(),
      sendDecorations: () => source._sendDecorations(),
      sendContextMenuItems: () => source._sendContextMenuItems(),
      markWorkspaceReady: graphData => callMarkWorkspaceReady(graphData),
      isAbortError: error => callIsAbortError(error),
      logError: (message, error) => {
        dependencies.logError(message, error);
      },
    });

    source._analysisController = state.analysisController;
    source._analysisRequestId = state.analysisRequestId;
    source._analyzerInitialized = state.analyzerInitialized;
    source._analyzerInitPromise = state.analyzerInitPromise;
  };

  const _analyzeAndSendData = async (): Promise<void> => {
    const state: GraphViewProviderAnalysisState = {
      analysisController: source._analysisController,
      analysisRequestId: source._analysisRequestId,
      analyzer: source._analyzer,
      analyzerInitialized: source._analyzerInitialized,
      analyzerInitPromise: source._analyzerInitPromise,
      filterPatterns: source._filterPatterns,
      disabledRules: source._disabledRules,
      disabledPlugins: source._disabledPlugins,
    };

    await dependencies.runAnalysisRequest(state, {
      executeAnalysis: (signal, requestId) => {
        const implementation = source._doAnalyzeAndSendData;
        if (implementation && implementation !== _doAnalyzeAndSendData) {
          return implementation(signal, requestId);
        }

        return _doAnalyzeAndSendData(signal, requestId);
      },
      isAbortError: error => callIsAbortError(error),
      logError: (message, error) => {
        dependencies.logError(message, error);
      },
      updateAnalysisController: controller => {
        source._analysisController = controller;
      },
      updateAnalysisRequestId: requestId => {
        source._analysisRequestId = requestId;
      },
    });

    source._analysisController = state.analysisController;
    source._analysisRequestId = state.analysisRequestId;
  };

  const methods: GraphViewProviderAnalysisMethods = {
    _analyzeAndSendData,
    _doAnalyzeAndSendData,
    _markWorkspaceReady,
    _isAnalysisStale,
    _isAbortError,
  };

  Object.assign(source as object, methods);

  return methods;
}
