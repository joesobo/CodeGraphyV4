import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisExecutionState,
} from '../execution';

export async function ensureGraphViewAnalyzerInitialized(
  signal: AbortSignal,
  requestId: number,
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
): Promise<boolean> {
  if (state.analyzerInitialized) {
    return true;
  }

  if (!state.analyzer) {
    return false;
  }

  if (!state.analyzerInitPromise) {
    state.analyzerInitPromise = state.analyzer
      .initialize()
      .then(() => {
        state.analyzerInitialized = true;
      })
      .finally(() => {
        state.analyzerInitPromise = undefined;
      });
  }

  await state.analyzerInitPromise;
  return !handlers.isAnalysisStale(signal, requestId);
}

export async function awaitGraphViewPluginActivation(
  signal: AbortSignal,
  requestId: number,
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
): Promise<boolean> {
  await (state.installedPluginActivationPromise ?? Promise.resolve());
  return !handlers.isAnalysisStale(signal, requestId);
}
