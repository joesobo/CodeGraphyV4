import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHarness, graphData } from './harness';

describe('webview/store/actions/bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts initial bootstrap while the first graph is still loading', () => {
    const { actions, getState } = createHarness();

    actions.beginInitialBootstrap();

    expect(getState()).toMatchObject({
      awaitingInitialBootstrap: true,
      bootstrapComplete: false,
      isLoading: true,
    });
  });

  it('does not restart initial bootstrap after graph data is loaded', () => {
    const { actions, getState } = createHarness({ graphData });

    actions.beginInitialBootstrap();

    expect(getState()).toMatchObject({
      awaitingInitialBootstrap: false,
      bootstrapComplete: false,
      isLoading: true,
    });
  });

  it('does not start initial bootstrap when loading has already settled', () => {
    const { actions, getState } = createHarness({ isLoading: false });

    actions.beginInitialBootstrap();

    expect(getState()).toMatchObject({
      awaitingInitialBootstrap: false,
      bootstrapComplete: false,
      isLoading: false,
    });
  });

  it('does not keep initial loading blocked on plugin assets once bootstrap and graph data are complete', () => {
    const { actions, getState } = createHarness({
      awaitingInitialBootstrap: true,
      bootstrapComplete: true,
      graphData,
      isLoading: true,
      pendingPluginAssetLoads: 1,
    });

    actions.beginPluginAssetLoad();
    expect(getState()).toMatchObject({
      isLoading: true,
      pendingPluginAssetLoads: 2,
    });

    actions.finishPluginAssetLoad();
    expect(getState()).toMatchObject({
      awaitingInitialBootstrap: false,
      isLoading: false,
      pendingPluginAssetLoads: 1,
    });

    actions.finishPluginAssetLoad();
    expect(getState()).toMatchObject({
      awaitingInitialBootstrap: false,
      isLoading: false,
      pendingPluginAssetLoads: 0,
    });

    actions.finishPluginAssetLoad();
    expect(getState()).toMatchObject({
      isLoading: false,
      pendingPluginAssetLoads: 0,
    });
  });

  it('keeps loading when plugin assets finish before graph data arrives', () => {
    const { actions, getState } = createHarness({
      bootstrapComplete: true,
      graphData: null,
      isLoading: true,
      pendingPluginAssetLoads: 1,
    });

    actions.finishPluginAssetLoad();

    expect(getState()).toMatchObject({
      isLoading: true,
      pendingPluginAssetLoads: 0,
    });
  });

  it('keeps loading when plugin assets finish before bootstrap completes', () => {
    const { actions, getState } = createHarness({
      bootstrapComplete: false,
      graphData,
      isLoading: true,
      pendingPluginAssetLoads: 1,
    });

    actions.finishPluginAssetLoad();

    expect(getState()).toMatchObject({
      isLoading: true,
      pendingPluginAssetLoads: 0,
    });
  });
});
