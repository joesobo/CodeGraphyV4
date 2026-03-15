import type { IGraphData } from '../../shared/types';
import type { GraphViewProviderAnalysisState } from './analysisLifecycle';
import type { GraphViewProviderAnalysisMethodsSource } from './providerAnalysisMethods';

interface GraphViewProviderWorkspaceReadyState {
  firstAnalysis: boolean;
  resolveFirstWorkspaceReady: (() => void) | undefined;
}

export function createGraphViewProviderAnalysisState(
  source: GraphViewProviderAnalysisMethodsSource,
): GraphViewProviderAnalysisState {
  return {
    analysisController: source._analysisController,
    analysisRequestId: source._analysisRequestId,
    analyzer: source._analyzer,
    analyzerInitialized: source._analyzerInitialized,
    analyzerInitPromise: source._analyzerInitPromise,
    filterPatterns: source._filterPatterns,
    disabledRules: source._disabledRules,
    disabledPlugins: source._disabledPlugins,
  };
}

export function syncGraphViewProviderAnalysisState(
  source: GraphViewProviderAnalysisMethodsSource,
  state: GraphViewProviderAnalysisState,
): void {
  source._analysisController = state.analysisController;
  source._analysisRequestId = state.analysisRequestId;
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
