import { createGraphViewProviderAnalysisHandlers } from './analysisHandlers';
import type { GraphViewProviderAnalysisDelegateCalls } from './analysisDelegates';
import type {
  GraphViewProviderAnalysisMethodDependencies,
  GraphViewProviderAnalysisMethodsSource,
} from './analysis';
import {
  createGraphViewProviderAnalysisState,
  syncGraphViewProviderAnalysisExecutionState,
} from './analysisState';

export function createGraphViewProviderDoAnalyzeAndSendData(
  source: GraphViewProviderAnalysisMethodsSource,
  dependencies: GraphViewProviderAnalysisMethodDependencies,
  delegates: GraphViewProviderAnalysisDelegateCalls,
): (signal: AbortSignal, requestId: number) => Promise<void> {
  return async (signal: AbortSignal, requestId: number): Promise<void> => {
    const state = createGraphViewProviderAnalysisState(source);

    await dependencies.executeAnalysis(
      signal,
      requestId,
      state,
      createGraphViewProviderAnalysisHandlers(source, dependencies, {
        isAnalysisStale: (nextSignal, nextRequestId) =>
          delegates.callIsAnalysisStale(nextSignal, nextRequestId),
        isAbortError: error => delegates.callIsAbortError(error),
        markWorkspaceReady: graphData => delegates.callMarkWorkspaceReady(graphData),
      }),
    );

    syncGraphViewProviderAnalysisExecutionState(source, state);
  };
}
