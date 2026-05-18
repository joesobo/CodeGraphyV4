/**
 * @fileoverview Abort helpers for workspace analysis.
 * @module core/analysis/abort
 */

export function createWorkspaceAnalysisAbortError(): Error {
  const error = new Error('Analysis aborted');
  error.name = 'AbortError';
  return error;
}

export function throwIfWorkspaceAnalysisAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createWorkspaceAnalysisAbortError();
  }
}
