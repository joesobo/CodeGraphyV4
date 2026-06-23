import type { VisibleGraphResult } from '../../../shared/visibleGraph';
import type { IGraphData } from '../../../shared/graph/contracts';

const VISIBLE_GRAPH_CACHE_LIMIT = 6;

export interface VisibleGraphCache {
  entries: Map<string, VisibleGraphResult>;
  graphData: IGraphData | null | undefined;
}

export function createVisibleGraphCache(): VisibleGraphCache {
  return {
    entries: new Map(),
    graphData: undefined,
  };
}

export function cacheVisibleGraphResult(
  cache: VisibleGraphCache,
  key: string,
  result: VisibleGraphResult,
): void {
  if (cache.entries.has(key)) {
    cache.entries.delete(key);
  }

  cache.entries.set(key, result);

  while (cache.entries.size > VISIBLE_GRAPH_CACHE_LIMIT) {
    const oldestKey = cache.entries.keys().next().value;
    if (!oldestKey) {
      return;
    }

    cache.entries.delete(oldestKey);
  }
}
