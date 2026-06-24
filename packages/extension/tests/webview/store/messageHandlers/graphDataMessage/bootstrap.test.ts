import { describe, expect, it } from 'vitest';
import { handleAppBootstrapComplete } from '../../../../../src/webview/store/messageHandlers/graphDataMessage/bootstrap';
import { createState } from '../graph/fixture';

describe('webview/store/messageHandlers/graphDataMessage/bootstrap', () => {
  it('settles loading when app bootstrap completes after graph data is ready', () => {
    const state = createState({
      awaitingInitialBootstrap: true,
      graphData: {
        nodes: [{ id: 'src/app.ts', label: 'App', color: '#94a3b8' }],
        edges: [],
      },
      isLoading: true,
    });

    expect(handleAppBootstrapComplete(
      { type: 'APP_BOOTSTRAP_COMPLETE' },
      { getState: () => state },
    )).toEqual({
      bootstrapComplete: true,
      awaitingInitialBootstrap: false,
      isLoading: false,
    });
  });

  it('preserves loading state when app bootstrap completes before graph data arrives', () => {
    const state = createState({
      awaitingInitialBootstrap: true,
      graphData: null,
      isLoading: true,
    });

    expect(handleAppBootstrapComplete(
      { type: 'APP_BOOTSTRAP_COMPLETE' },
      { getState: () => state },
    )).toEqual({
      bootstrapComplete: true,
      awaitingInitialBootstrap: true,
      isLoading: true,
    });
  });
});
