import { afterEach, describe, expect, it, vi } from 'vitest';

import { withTimeout } from '../../../../../src/extension/perf/scope/waiters/timeout';

describe('extension/perf/scope/waiters/timeout', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('clears its timer when the measured promise resolves', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    await expect(withTimeout(Promise.resolve('ready'), 100, () => 'late'))
      .resolves.toBe('ready');
    expect(clearTimeoutSpy).toHaveBeenCalledOnce();
  });

  it('rejects with the lazy timeout description and clears its timer', async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const message = vi.fn(() => 'scope timeout');
    const result = withTimeout(new Promise<never>(() => {}), 50, message);
    const rejection = expect(result).rejects.toThrow('scope timeout');

    await vi.advanceTimersByTimeAsync(50);

    await rejection;
    expect(message).toHaveBeenCalledOnce();
    expect(clearTimeoutSpy).toHaveBeenCalledOnce();
  });
});
