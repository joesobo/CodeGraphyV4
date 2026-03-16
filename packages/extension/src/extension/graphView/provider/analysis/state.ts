import type { IGraphData } from '../../../shared/types';
import type { GraphViewProviderAnalysisState } from '../analysis/lifecycle';
import type { GraphViewProviderAnalysisMethodsSource } from './analysis';

interface GraphViewProviderWorkspaceReadyState {
  firstAnalysis: boolean;
  resolveFirstWorkspaceReady: (() => void) | undefined;
}

export function createGraphViewProviderAnalysisState(
  source: GraphViewProviderAnalysisMethodsSource,
): GraphViewProviderAnalysisState {
  return {
    get analysisController() {
      return source._analysisController;
    },
    set analysisController(controller) {
      source._analysisController = controller;
    },
    get analysisRequestId() {
      return source._analysisRequestId;
    },
    set analysisRequestId(requestId) {
      source._analysisRequestId = requestId;
    },
    get analyzer() {
      return source._analyzer;
    },
    set analyzer(analyzer) {
      source._analyzer = analyzer;
    },
    get analyzerInitialized() {
      return source._analyzerInitialized;
    },
    set analyzerInitialized(initialized) {
      source._analyzerInitialized = initialized;
    },
    get analyzerInitPromise() {
      return source._analyzerInitPromise;
    },
    set analyzerInitPromise(promise) {
      source._analyzerInitPromise = promise;
    },
    get filterPatterns() {
      return source._filterPatterns;
    },
    set filterPatterns(filterPatterns) {
      source._filterPatterns = filterPatterns;
    },
    get disabledRules() {
      return source._disabledRules;
    },
    set disabledRules(disabledRules) {
      source._disabledRules = disabledRules;
    },
    get disabledPlugins() {
      return source._disabledPlugins;
    },
    set disabledPlugins(disabledPlugins) {
      source._disabledPlugins = disabledPlugins;
    },
  };
}

export function syncGraphViewProviderAnalysisState(
  source: GraphViewProviderAnalysisMethodsSource,
  state: GraphViewProviderAnalysisState,
): void {
  source._analysisController = state.analysisController;
  source._analysisRequestId = state.analysisRequestId;
}

export function syncGraphViewProviderAnalysisExecutionState(
  source: GraphViewProviderAnalysisMethodsSource,
  state: GraphViewProviderAnalysisState,
): void {
  syncGraphViewProviderAnalysisState(source, state);
  source._analyzerInitialized = state.analyzerInitialized;
  source._analyzerInitPromise = state.analyzerInitPromise;
}

export function createGraphViewProviderWorkspaceReadyState(
  source: GraphViewProviderAnalysisMethodsSource,
): GraphViewProviderWorkspaceReadyState {
  return {
    firstAnalysis: source._firstAnalysis,
    resolveFirstWorkspaceReady: source._resolveFirstWorkspaceReady,
  };
}

export function syncGraphViewProviderWorkspaceReadyState(
  source: GraphViewProviderAnalysisMethodsSource,
  state: GraphViewProviderWorkspaceReadyState,
): void {
  source._firstAnalysis = state.firstAnalysis;
  source._resolveFirstWorkspaceReady = state.resolveFirstWorkspaceReady;
}

export function setGraphViewProviderRawGraphData(
  source: GraphViewProviderAnalysisMethodsSource,
  graphData: IGraphData,
): void {
  source._rawGraphData = graphData;
}

export function setGraphViewProviderGraphData(
  source: GraphViewProviderAnalysisMethodsSource,
  graphData: IGraphData,
): void {
  source._graphData = graphData;
}
