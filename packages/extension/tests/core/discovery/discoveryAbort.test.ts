import { describe, expect, it } from 'vitest';
import { createAbortError, throwIfAborted } from '../../../src/core/discovery/discoveryAbort';

describe('discoveryAbort', () => {
  it('creates abort errors with the expected name and message', () => {
    expect(createAbortError()).toMatchObject({
      name: 'AbortError',
      message: 'Discovery aborted',
    });
  });

  it('does nothing when no signal is provided', () => {
    expect(() => throwIfAborted()).not.toThrow();
  });

  it('does nothing when the signal is not aborted', () => {
    const controller = new AbortController();

    expect(() => throwIfAborted(controller.signal)).not.toThrow();
  });

  it('throws an abort error when the signal is aborted', () => {
    const controller = new AbortController();
    controller.abort();

    try {
      throwIfAborted(controller.signal);
      throw new Error('expected throwIfAborted to throw');
    } catch (error) {
      expect(error).toMatchObject({
        name: 'AbortError',
        message: 'Discovery aborted',
      });
    }
  });
});
