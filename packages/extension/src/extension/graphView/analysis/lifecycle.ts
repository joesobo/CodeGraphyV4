import type { IGraphData } from '../../../shared/contracts';
import {
  executeGraphViewAnalysis,
  type GraphViewAnalysisExecutionHandlers,
  type GraphViewAnalysisExecutionState,
} from './execution';
import {
  runGraphViewAnalysisRequest,
  type GraphViewAnalysisRequestState,
} from './request';

interface GraphViewWorkspaceReadyRegistryLike {
  notifyWorkspaceReady(graphData: IGraphData): void;
}

export interface GraphViewProviderAnalysisState
  extends GraphViewAnalysisRequestState,
    GraphViewAnalysisExecutionState {}

export interface GraphViewProviderAnalysisRequestHandlers {
  executeAnalysis(signal: AbortSignal, requestId: number): Promise<void>;
  isAbortError(error: unknown): boolean;
  logError(message: string, error: unknown): void;
  updateAnalysisController?(controller: AbortController | undefined): void;
  updateAnalysisRequestId?(requestId: number): void;
}

export interface GraphViewProviderAnalysisHandlers
  extends Omit<
    GraphViewAnalysisExecutionHandlers,
    'isAnalysisStale' | 'isAbortError' | 'logError'
  > {
  isAnalysisStale(signal: AbortSignal, requestId: number): boolean;
  isAbortError(error: unknown): boolean;
  logError(message: string, error: unknown): void;
}

interface GraphViewWorkspaceReadyState {
  firstAnalysis: boolean;
  resolveFirstWorkspaceReady: (() => void) | undefined;
}

export async function runGraphViewProviderAnalysisRequest(
  state: GraphViewAnalysisRequestState,
  handlers: GraphViewProviderAnalysisRequestHandlers,
): Promise<void> {
  await runGraphViewAnalysisRequest(state, {
    executeAnalysis: (signal, requestId) => handlers.executeAnalysis(signal, requestId),
    isAbortError: error => handlers.isAbortError(error),
    logError: (message, error) => {
      handlers.logError(message, error);
    },
    updateAnalysisController: controller => {
      state.analysisController = controller;
      handlers.updateAnalysisController?.(controller);
    },
    updateAnalysisRequestId: requestId => {
      state.analysisRequestId = requestId;
      handlers.updateAnalysisRequestId?.(requestId);
    },
  });
}

export async function executeGraphViewProviderAnalysis(
  signal: AbortSignal,
  requestId: number,
  state: GraphViewProviderAnalysisState,
  handlers: GraphViewProviderAnalysisHandlers,
): Promise<void> {
  await executeGraphViewAnalysis(signal, requestId, state, {
    ...handlers,
    isAnalysisStale: (nextSignal, nextRequestId) =>
      handlers.isAnalysisStale(nextSignal, nextRequestId),
    isAbortError: error => handlers.isAbortError(error),
    logError: (message, error) => {
      handlers.logError(message, error);
    },
  });
}

export function markGraphViewWorkspaceReady(
  state: GraphViewWorkspaceReadyState,
  registry: GraphViewWorkspaceReadyRegistryLike | undefined,
  graphData: IGraphData,
): void {
  if (!state.firstAnalysis) return;

  state.firstAnalysis = false;
  registry?.notifyWorkspaceReady(graphData);
  state.resolveFirstWorkspaceReady?.();
  state.resolveFirstWorkspaceReady = undefined;
}

export function isGraphViewAnalysisStale(
  signal: AbortSignal,
  requestId: number,
  currentRequestId: number,
): boolean {
  return signal.aborted || requestId !== currentRequestId;
}

export function isGraphViewAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
