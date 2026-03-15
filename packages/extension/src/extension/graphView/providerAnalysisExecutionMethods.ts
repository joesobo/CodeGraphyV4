import { createGraphViewProviderAnalysisHandlers } from './providerAnalysisMethodHandlers';
import type { GraphViewProviderAnalysisDelegateCalls } from './providerAnalysisMethodDelegates';
import type {
  GraphViewProviderAnalysisMethodDependencies,
  GraphViewProviderAnalysisMethodsSource,
} from './providerAnalysisMethods';
import {
  createGraphViewProviderAnalysisState,
  syncGraphViewProviderAnalysisExecutionState,
} from './providerAnalysisMethodState';

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
