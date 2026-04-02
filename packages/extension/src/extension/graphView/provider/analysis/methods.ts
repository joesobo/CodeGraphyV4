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
  _analyzer?: GraphViewProviderAnalysisState['analyzer'] & GraphViewProviderAnalysisAnalyzerLike;
  _analyzerInitialized: boolean;
  _analyzerInitPromise?: Promise<void>;
  _installedPluginActivationPromise?: Promise<void>;
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
  const _doAnalyzeAndSendData = createGraphViewProviderDoAnalyzeAndSendData(
    source,
    dependencies,
    delegates,
  );
  const _analyzeAndSendData = createGraphViewProviderAnalyzeAndSendData(
    source,
    dependencies,
    delegates,
    _doAnalyzeAndSendData,
  );

  const methods: GraphViewProviderAnalysisMethods = {
    _analyzeAndSendData,
    _doAnalyzeAndSendData,
    _markWorkspaceReady,
    _isAnalysisStale,
    _isAbortError,
  };

  return methods;
}
