import { createGraphViewProviderAnalysisRequestHandlers } from './handlers';
import type { GraphViewProviderAnalysisDelegateCalls } from './delegates';
import type {
  GraphViewProviderAnalysisMethodDependencies,
  GraphViewProviderAnalysisMethodsSource,
} from './methods';
import type { GraphViewAnalysisMode } from '../../analysis/execution';
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
  ) => Promise<void>,
  mode: GraphViewAnalysisMode,
): (changedFilePaths?: readonly string[]) => Promise<void> {
  return async (changedFilePaths?: readonly string[]): Promise<void> => {
    const state = createGraphViewProviderAnalysisState(source, mode, changedFilePaths);

    await dependencies.runAnalysisRequest(
      state,
      createGraphViewProviderAnalysisRequestHandlers(source, dependencies, {
        executeAnalysis: (signal, requestId) => changedFilePaths
          ? doAnalyzeAndSendData(signal, requestId, changedFilePaths)
          : doAnalyzeAndSendData(signal, requestId),
        isAbortError: error => delegates.callIsAbortError(error),
      }),
    );

    syncGraphViewProviderAnalysisState(source, state);
  };
}
