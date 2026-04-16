import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { graphStore } from '../../../src/webview/store/state';
import {
  createRefreshConfig,
  requestGraphIndex,
} from '../../../src/webview/components/toolbar/refresh';

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

import { postMessage } from '../../../src/webview/vscodeApi';

describe('webview/toolbar/refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    graphStore.setState({
      graphHasIndex: false,
      graphIsIndexing: false,
      graphIndexProgress: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates index and refresh configs from graph state', () => {
    expect(createRefreshConfig(false)).toEqual({
      phase: 'Indexing Repo',
      title: 'Index Repo',
      type: 'INDEX_GRAPH',
    });
    expect(createRefreshConfig(true)).toEqual({
      phase: 'Refreshing Index',
      title: 'Refresh',
      type: 'REFRESH_GRAPH',
    });
  });

  it('starts optimistic indexing and clears it when the host stays silent', () => {
    const timeoutRef = { current: null as ReturnType<typeof setTimeout> | null };

    requestGraphIndex(false, timeoutRef);
    expect(postMessage).toHaveBeenCalledWith({ type: 'INDEX_GRAPH' });
    expect(graphStore.getState().graphIsIndexing).toBe(true);

    vi.advanceTimersByTime(10_000);

    expect(graphStore.getState().graphIsIndexing).toBe(false);
    expect(graphStore.getState().graphIndexProgress).toBeNull();
  });
});
