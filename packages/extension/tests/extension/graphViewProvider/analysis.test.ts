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
    const loadSpy = vi
      .spyOn(internals._settingsStateMethods, '_loadDisabledRulesAndPlugins')
      .mockReturnValue(true);
    const loadGroupsSpy = vi
      .spyOn(internals._settingsStateMethods, '_loadGroupsAndFilterPatterns')
      .mockImplementation(() => {});
    const analyzeSpy = vi
      .spyOn(internals._analysisMethods, '_analyzeAndSendData')
      .mockResolvedValue();
    const settingsSpy = vi
      .spyOn(internals._settingsStateMethods, '_sendAllSettings')
      .mockImplementation(() => {});
    const favoritesSpy = vi
      .spyOn(internals._fileVisitMethods, '_sendFavorites')
      .mockImplementation(() => {});

    await harness.provider.refresh();

    expect(loadSpy).toHaveBeenCalledOnce();
    expect(loadGroupsSpy).toHaveBeenCalledOnce();
    expect(analyzeSpy).toHaveBeenCalledOnce();
    expect(settingsSpy).toHaveBeenCalledOnce();
    expect(favoritesSpy).toHaveBeenCalledOnce();
  });
});
