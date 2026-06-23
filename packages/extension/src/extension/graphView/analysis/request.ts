import type { DiagnosticEventInput } from '@codegraphy-dev/core';
import { recordExtensionPerformanceEvent } from '../../performance/marks';

export interface GraphViewAnalysisRequestState {
  analysisController: AbortController | undefined;
  analysisRequestId: number;
}

export interface GraphViewAnalysisRequestHandlers {
  executeAnalysis(signal: AbortSignal, requestId: number): Promise<void>;
  isAbortError(error: unknown): boolean;
  logError(message: string, error: unknown): void;
  emitDiagnostic?(input: DiagnosticEventInput): void;
  updateAnalysisController(controller: AbortController | undefined): void;
  updateAnalysisRequestId(requestId: number): void;
}

function createRequestContext(
  state: GraphViewAnalysisRequestState,
  requestId: number,
): Record<string, number | string | undefined> {
  const diagnosticState = state as GraphViewAnalysisRequestState & {
    mode?: string;
    filterPatterns?: readonly string[];
    disabledPlugins?: ReadonlySet<string>;
  };

  return {
    requestId,
    mode: diagnosticState.mode,
    filterPatternCount: diagnosticState.filterPatterns?.length ?? 0,
    disabledPluginCount: diagnosticState.disabledPlugins?.size ?? 0,
  };
}

export async function runGraphViewAnalysisRequest(
  state: GraphViewAnalysisRequestState,
  handlers: GraphViewAnalysisRequestHandlers,
): Promise<void> {
  state.analysisController?.abort();
  const controller = new AbortController();
  state.analysisController = controller;
  handlers.updateAnalysisController(controller);
  const requestId = ++state.analysisRequestId;
  handlers.updateAnalysisRequestId(requestId);
  const startedAt = Date.now();
  const requestContext = createRequestContext(state, requestId);
  recordExtensionPerformanceEvent('graphAnalysis.request.start', requestContext);
  handlers.emitDiagnostic?.({
    area: 'extension.analysis',
    event: 'request-started',
    context: requestContext,
  });

  try {
    await handlers.executeAnalysis(controller.signal, requestId);
    recordExtensionPerformanceEvent('graphAnalysis.request.completed', {
      ...requestContext,
      durationMs: Date.now() - startedAt,
    });
    handlers.emitDiagnostic?.({
      area: 'extension.analysis',
      event: 'request-completed',
      context: {
        ...requestContext,
        durationMs: Date.now() - startedAt,
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    if (handlers.isAbortError(error)) {
      recordExtensionPerformanceEvent('graphAnalysis.request.aborted', {
        ...requestContext,
        durationMs,
      });
    } else {
      recordExtensionPerformanceEvent('graphAnalysis.request.failed', {
        ...requestContext,
        durationMs,
      });
      handlers.emitDiagnostic?.({
        area: 'extension.analysis',
        event: 'request-failed',
        context: {
          ...requestContext,
          durationMs: Date.now() - startedAt,
          error,
        },
      });
      handlers.logError('[CodeGraphy] Analysis failed:', error);
    }
  } finally {
    if (state.analysisController === controller) {
      state.analysisController = undefined;
      handlers.updateAnalysisController(undefined);
    }
  }
}
