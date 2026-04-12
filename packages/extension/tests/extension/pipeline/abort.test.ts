import { describe, expect, it } from 'vitest';
import {
  createWorkspaceAnalysisAbortError,
  throwIfWorkspaceAnalysisAborted,
} from '../../../src/extension/pipeline/abort';

describe('pipeline/abort', () => {
  it('creates abort errors with the expected name and message', () => {
    expect(createWorkspaceAnalysisAbortError()).toMatchObject({
      name: 'AbortError',
      message: 'Analysis aborted',
    });
  });

  it('does nothing when no signal is provided', () => {
    expect(() => throwIfWorkspaceAnalysisAborted()).not.toThrow();
  });

  it('does nothing when the signal is not aborted', () => {
    const controller = new AbortController();

    expect(() => throwIfWorkspaceAnalysisAborted(controller.signal)).not.toThrow();
  });

  it('throws an abort error when the signal is aborted', () => {
    const controller = new AbortController();
    controller.abort();

    try {
      throwIfWorkspaceAnalysisAborted(controller.signal);
      throw new Error('expected throwIfWorkspaceAnalysisAborted to throw');
    } catch (error) {
      expect(error).toMatchObject({
        name: 'AbortError',
        message: 'Analysis aborted',
      });
    }
  });
});
