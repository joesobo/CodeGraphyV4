import type React from 'react';
import { graphStore } from '../../../store/state';
import { postMessage } from '../../../vscodeApi';

export interface ToolbarRefreshConfig {
  phase: string;
  title: string;
  type: 'INDEX_GRAPH' | 'REFRESH_GRAPH';
}

export function clearPendingIndexTimeout(
  timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
): void {
  if (!timeoutRef.current) {
    return;
  }

  clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
}

export function createRefreshConfig(
  graphHasIndex: boolean,
  graphIndexFreshness: 'fresh' | 'stale' | 'missing',
): ToolbarRefreshConfig {
  if (graphIndexFreshness === 'stale') {
    return { phase: 'Refreshing Index', title: 'Reindex Repo', type: 'REFRESH_GRAPH' };
  }

  return graphHasIndex
    ? { phase: 'Refreshing Index', title: 'Refresh', type: 'REFRESH_GRAPH' }
    : { phase: 'Indexing Repo', title: 'Index Repo', type: 'INDEX_GRAPH' };
}

export function requestGraphIndex(
  graphHasIndex: boolean,
  graphIndexFreshness: 'fresh' | 'stale' | 'missing',
  timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
): void {
  const refresh = createRefreshConfig(graphHasIndex, graphIndexFreshness);

  clearPendingIndexTimeout(timeoutRef);
  graphStore.setState({
    graphIsIndexing: true,
    graphIndexProgress: {
      phase: refresh.phase,
      current: 0,
      total: 1,
    },
  });
  timeoutRef.current = setTimeout(() => {
    const state = graphStore.getState();
    if (
      state.graphIsIndexing
      && state.graphIndexProgress?.phase === refresh.phase
      && state.graphIndexProgress.current === 0
      && state.graphIndexProgress.total === 1
    ) {
      graphStore.setState({
        graphIsIndexing: false,
        graphIndexProgress: null,
      });
    }
  }, 10_000);
  postMessage({ type: refresh.type });
}
