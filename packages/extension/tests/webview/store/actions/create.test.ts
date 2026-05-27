import { describe, expect, it } from 'vitest';
import { createHarness } from './harness';

describe('webview/store/actions/create', () => {
  it('creates actions from every store action group', () => {
    const { actions } = createHarness();

    expect(actions).toEqual(expect.objectContaining({
      beginInitialBootstrap: expect.any(Function),
      handleExtensionMessage: expect.any(Function),
      setDirectionMode: expect.any(Function),
      setOptimisticLegendUpdate: expect.any(Function),
      setSearchQuery: expect.any(Function),
    }));
  });
});
