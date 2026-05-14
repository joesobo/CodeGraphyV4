/**
 * @fileoverview Abort handling helpers for file discovery.
 * @module core/discovery/abort
 */

export function createAbortError(): Error {
  const error = new Error('Discovery aborted');
  error.name = 'AbortError';
  return error;
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createAbortError();
  }
}
