import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphViewProviderTestHarness, deferredPromise } from './testHarness';

describe('GraphViewProvider analysis refresh', () => {
  let harness = createGraphViewProviderTestHarness();

  beforeEach(() => {
    vi.clearAllMocks();
    harness = createGraphViewProviderTestHarness();
  });

  it('aborts in-flight analysis when a newer refresh starts', async () => {
    const providerAny = harness.provider as unknown as {
      _doAnalyzeAndSendData: (signal: AbortSignal) => Promise<void>;
    };
    const firstRun = deferredPromise<void>();
    const seenSignals: AbortSignal[] = [];

    providerAny._doAnalyzeAndSendData = vi.fn((signal: AbortSignal) => {
      seenSignals.push(signal);
      if (seenSignals.length === 1) {
        return firstRun.promise;
      }
      return Promise.resolve();
    });

    const refresh1 = harness.provider.refresh();
    await Promise.resolve();

    const refresh2 = harness.provider.refresh();
    await Promise.resolve();

    expect(seenSignals.length).toBe(2);
    expect(seenSignals[0].aborted).toBe(true);
    expect(seenSignals[1].aborted).toBe(false);

    firstRun.resolve();
    await Promise.all([refresh1, refresh2]);
  });
});
