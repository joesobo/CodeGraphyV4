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
  doAnalyzeAndSendData: (signal: AbortSignal, requestId: number) => Promise<void>,
  mode: GraphViewAnalysisMode,
): () => Promise<void> {
  return async (): Promise<void> => {
    const state = createGraphViewProviderAnalysisState(source, mode);

    await dependencies.runAnalysisRequest(
      state,
      createGraphViewProviderAnalysisRequestHandlers(source, dependencies, {
        executeAnalysis: (signal, requestId) => doAnalyzeAndSendData(signal, requestId),
        isAbortError: error => delegates.callIsAbortError(error),
      }),
    );

    syncGraphViewProviderAnalysisState(source, state);
  };
}
