import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getGraphViewProviderInternals } from './internals';
import { createGraphViewProviderTestHarness } from './testHarness';

describe('GraphViewProvider analysis refresh', () => {
  let harness = createGraphViewProviderTestHarness();

  beforeEach(() => {
    vi.clearAllMocks();
    harness = createGraphViewProviderTestHarness();
  });

  it('refresh delegates analysis work through the analysis method container', async () => {
    const internals = getGraphViewProviderInternals(harness.provider);
    const refreshSpy = vi
      .spyOn(internals._refreshMethods, 'refresh')
      .mockResolvedValue();

    await harness.provider.refresh();

    expect(refreshSpy).toHaveBeenCalledOnce();
  });
});
