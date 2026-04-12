import { createGraphViewProviderAnalysisHandlers } from './handlers';
import type { GraphViewProviderAnalysisDelegateCalls } from './delegates';
import type {
  GraphViewProviderAnalysisMethodDependencies,
  GraphViewProviderAnalysisMethodsSource,
} from './methods';
import type { GraphViewAnalysisMode } from '../../analysis/execution';
import {
  createGraphViewProviderAnalysisState,
  syncGraphViewProviderAnalysisExecutionState,
} from './state';

export function createGraphViewProviderDoAnalyzeAndSendData(
  source: GraphViewProviderAnalysisMethodsSource,
  dependencies: GraphViewProviderAnalysisMethodDependencies,
  delegates: GraphViewProviderAnalysisDelegateCalls,
  mode: GraphViewAnalysisMode,
): (signal: AbortSignal, requestId: number) => Promise<void> {
  return async (signal: AbortSignal, requestId: number): Promise<void> => {
    const state = createGraphViewProviderAnalysisState(source, mode);

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
