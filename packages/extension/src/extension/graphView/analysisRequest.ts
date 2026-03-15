export interface GraphViewAnalysisRequestState {
  analysisController: AbortController | undefined;
  analysisRequestId: number;
}

export interface GraphViewAnalysisRequestHandlers {
  executeAnalysis(signal: AbortSignal, requestId: number): Promise<void>;
  isAbortError(error: unknown): boolean;
  logError(message: string, error: unknown): void;
}

export async function runGraphViewAnalysisRequest(
  state: GraphViewAnalysisRequestState,
  handlers: GraphViewAnalysisRequestHandlers,
): Promise<void> {
  state.analysisController?.abort();
  const controller = new AbortController();
  state.analysisController = controller;
  const requestId = ++state.analysisRequestId;

  try {
    await handlers.executeAnalysis(controller.signal, requestId);
  } catch (error) {
    if (!handlers.isAbortError(error)) {
      handlers.logError('[CodeGraphy] Analysis failed:', error);
    }
  } finally {
    if (state.analysisController === controller) {
      state.analysisController = undefined;
    }
  }
}
