import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { graphStore } from '../../../../src/webview/store/state';
import {
  clearPendingIndexTimeout,
  createRefreshConfig,
  requestGraphIndex,
} from '../../../../src/webview/components/toolbar/actions/refresh';

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

import { postMessage } from '../../../../src/webview/vscodeApi';

describe('webview/toolbar/refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
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

  it('clears an existing timeout and nulls the ref', () => {
    const timeoutRef = { current: setTimeout(() => undefined, 5_000) };
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    clearPendingIndexTimeout(timeoutRef);

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(timeoutRef.current).toBeNull();
  });

  it('leaves an empty timeout ref untouched without calling clearTimeout', () => {
    const timeoutRef = { current: null as ReturnType<typeof setTimeout> | null };
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    clearPendingIndexTimeout(timeoutRef);

    expect(clearTimeoutSpy).not.toHaveBeenCalled();
    expect(timeoutRef.current).toBeNull();
  });

  it('keeps optimistic indexing when the host reports real progress before the fallback timeout', () => {
    const timeoutRef = { current: null as ReturnType<typeof setTimeout> | null };

    requestGraphIndex(false, timeoutRef);
    graphStore.setState({
      graphIndexProgress: {
        phase: 'Indexing Repo',
        current: 1,
        total: 5,
      },
    });

    vi.advanceTimersByTime(10_000);

    expect(graphStore.getState().graphIsIndexing).toBe(true);
    expect(graphStore.getState().graphIndexProgress).toEqual({
      phase: 'Indexing Repo',
      current: 1,
      total: 5,
    });
  });

  it('keeps optimistic indexing when the host clears progress before the fallback timeout fires', () => {
    const timeoutRef = { current: null as ReturnType<typeof setTimeout> | null };

    requestGraphIndex(false, timeoutRef);
    graphStore.setState({
      graphIndexProgress: null,
    });

    expect(() => vi.advanceTimersByTime(10_000)).not.toThrow();
    expect(graphStore.getState().graphIsIndexing).toBe(true);
    expect(graphStore.getState().graphIndexProgress).toBeNull();
  });

  it('keeps optimistic indexing when the phase changes before the fallback timeout fires', () => {
    const timeoutRef = { current: null as ReturnType<typeof setTimeout> | null };

    requestGraphIndex(false, timeoutRef);
    graphStore.setState({
      graphIndexProgress: {
        phase: 'Scanning Files',
        current: 0,
        total: 1,
      },
    });

    vi.advanceTimersByTime(10_000);

    expect(graphStore.getState().graphIsIndexing).toBe(true);
    expect(graphStore.getState().graphIndexProgress).toEqual({
      phase: 'Scanning Files',
      current: 0,
      total: 1,
    });
  });

  it('keeps optimistic indexing when the indexer is no longer marked active before the timeout fires', () => {
    const timeoutRef = { current: null as ReturnType<typeof setTimeout> | null };

    requestGraphIndex(false, timeoutRef);
    graphStore.setState({
      graphIsIndexing: false,
      graphIndexProgress: {
        phase: 'Indexing Repo',
        current: 0,
        total: 1,
      },
    });

    vi.advanceTimersByTime(10_000);

    expect(graphStore.getState().graphIsIndexing).toBe(false);
    expect(graphStore.getState().graphIndexProgress).toEqual({
      phase: 'Indexing Repo',
      current: 0,
      total: 1,
    });
  });

  it('replaces the previous timeout and sends a refresh message when an index already exists', () => {
    const timeoutRef = { current: setTimeout(() => undefined, 5_000) };

    requestGraphIndex(true, timeoutRef);

    expect(postMessage).toHaveBeenCalledWith({ type: 'REFRESH_GRAPH' });
    expect(graphStore.getState().graphIndexProgress).toEqual({
      phase: 'Refreshing Index',
      current: 0,
      total: 1,
    });
    expect(timeoutRef.current).not.toBeNull();
  });

  it('keeps optimistic indexing when the placeholder total changes before the timeout fires', () => {
    const timeoutRef = { current: null as ReturnType<typeof setTimeout> | null };

    requestGraphIndex(true, timeoutRef);
    graphStore.setState({
      graphIndexProgress: {
        phase: 'Refreshing Index',
        current: 0,
        total: 2,
      },
    });

    vi.advanceTimersByTime(10_000);

    expect(graphStore.getState().graphIsIndexing).toBe(true);
    expect(graphStore.getState().graphIndexProgress).toEqual({
      phase: 'Refreshing Index',
      current: 0,
      total: 2,
    });
  });
});
