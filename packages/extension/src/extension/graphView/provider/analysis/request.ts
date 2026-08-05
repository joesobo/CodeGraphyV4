import { createGraphViewProviderAnalysisRequestHandlers } from './handlers';
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
  syncGraphViewProviderAnalysisState,
} from './state';

export function createGraphViewProviderAnalyzeAndSendData(
  source: GraphViewProviderAnalysisMethodsSource,
  dependencies: GraphViewProviderAnalysisMethodDependencies,
  delegates: Pick<GraphViewProviderAnalysisDelegateCalls, 'callIsAbortError'>,
  doAnalyzeAndSendData: (
    signal: AbortSignal,
    requestId: number,
    changedFilePaths?: readonly string[],
    onProgress?: (progress: GraphViewIndexingProgress) => void,
  ) => Promise<void>,
  mode: GraphViewAnalysisMode,
): (
  changedFilePaths?: readonly string[],
  onProgress?: (progress: GraphViewIndexingProgress) => void,
) => Promise<void> {
  return async (changedFilePaths, onProgress): Promise<void> => {
    const state = createGraphViewProviderAnalysisState(source, mode, changedFilePaths);

    await dependencies.runAnalysisRequest(
      state,
      createGraphViewProviderAnalysisRequestHandlers(source, dependencies, {
        executeAnalysis: (signal, requestId) =>
          doAnalyzeAndSendData(signal, requestId, changedFilePaths, onProgress),
        isAbortError: error => delegates.callIsAbortError(error),
      }),
    );

    syncGraphViewProviderAnalysisState(source, state);
  };
}
