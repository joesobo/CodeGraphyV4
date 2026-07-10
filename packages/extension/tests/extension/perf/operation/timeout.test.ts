import { afterEach, describe, expect, it, vi } from 'vitest';

import { timeoutAfter } from '../../../../src/extension/perf/operation/timeout';

describe('extension/perf/operation/timeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects with the operation id at the configured deadline', async () => {
    vi.useFakeTimers();
    const timeout = timeoutAfter('operation-1', 25);
    const assertion = expect(timeout.promise).rejects.toThrow(
      'Timed out waiting for graph acknowledgement for operation-1',
    );

    await vi.advanceTimersByTimeAsync(25);

    await assertion;
  });

  it('clears its pending timer when disposed', () => {
    vi.useFakeTimers();
    const timeout = timeoutAfter('operation-1', 25);
    expect(vi.getTimerCount()).toBe(1);

    timeout.dispose();

    expect(vi.getTimerCount()).toBe(0);
  });
});
