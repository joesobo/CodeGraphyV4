import { createGraphViewProviderAnalysisHandlers } from './handlers';
import type { GraphViewProviderAnalysisDelegateCalls } from './delegates';
import type {
  GraphViewProviderAnalysisMethodDependencies,
  GraphViewProviderAnalysisMethodsSource,
} from './methods';
import type {
  GraphViewAnalysisMode,
  GraphViewIndexingProgress,
} from '../../analysis/execution';
import {
  createGraphViewProviderAnalysisState,
  syncGraphViewProviderAnalysisExecutionState,
} from './state';

export function createGraphViewProviderDoAnalyzeAndSendData(
  source: GraphViewProviderAnalysisMethodsSource,
  dependencies: GraphViewProviderAnalysisMethodDependencies,
  delegates: GraphViewProviderAnalysisDelegateCalls,
  mode: GraphViewAnalysisMode,
): (
  signal: AbortSignal,
  requestId: number,
  changedFilePaths?: readonly string[],
  onProgress?: (progress: GraphViewIndexingProgress) => void,
) => Promise<void> {
  return async (
    signal: AbortSignal,
    requestId: number,
    changedFilePaths?: readonly string[],
    onProgress?: (progress: GraphViewIndexingProgress) => void,
  ): Promise<void> => {
    const state = createGraphViewProviderAnalysisState(source, mode, changedFilePaths);

    await dependencies.executeAnalysis(
      signal,
      requestId,
      state,
      createGraphViewProviderAnalysisHandlers(source, dependencies, {
        isAnalysisStale: (nextSignal, nextRequestId) =>
          delegates.callIsAnalysisStale(nextSignal, nextRequestId),
        isAbortError: error => delegates.callIsAbortError(error),
        markWorkspaceReady: (graphData, disabledPlugins) =>
          delegates.callMarkWorkspaceReady(graphData, disabledPlugins),
        onProgress,
      }),
    );

    syncGraphViewProviderAnalysisExecutionState(source, state);
  };
}
