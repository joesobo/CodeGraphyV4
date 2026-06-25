import { describe, expect, it } from 'vitest';
import type { VisibleGraphResult } from '../../../../src/shared/visibleGraph/contracts';
import {
  cacheVisibleGraphResult,
  createVisibleGraphCache,
} from '../../../../src/webview/search/filteredGraph/visibleCache';

describe('webview/search/filteredGraph/visibleCache', () => {
  it('creates an empty cache ready for visible graph results', () => {
    const cache = createVisibleGraphCache();

    expect(cache.entries).toBeInstanceOf(Map);
    expect(cache.entries.size).toBe(0);
    expect(cache.graphData).toBeUndefined();
  });

  it('stores cached results by key', () => {
    const cache = createVisibleGraphCache();
    const cachedResult = createVisibleResult();

    cacheVisibleGraphResult(cache, 'visible', cachedResult);

    expect(cache.entries.get('visible')).toBe(cachedResult);
  });

  it('replaces an existing result and moves it to the newest cache slot', () => {
    const cache = createVisibleGraphCache();
    const staleFirstResult = createVisibleResult();
    const freshFirstResult = createVisibleResult();
    const seventhResult = createVisibleResult();

    cacheVisibleGraphResult(cache, 'first', staleFirstResult);
    cacheVisibleGraphResult(cache, 'second', createVisibleResult());
    cacheVisibleGraphResult(cache, 'third', createVisibleResult());
    cacheVisibleGraphResult(cache, 'fourth', createVisibleResult());
    cacheVisibleGraphResult(cache, 'fifth', createVisibleResult());
    cacheVisibleGraphResult(cache, 'sixth', createVisibleResult());
    cacheVisibleGraphResult(cache, 'first', freshFirstResult);
    cacheVisibleGraphResult(cache, 'seventh', seventhResult);

    expect(cache.entries.get('first')).toBe(freshFirstResult);
    expect(cache.entries.has('second')).toBe(false);
    expect(cache.entries.get('seventh')).toBe(seventhResult);
  });

  it('evicts the oldest entries after six cached results', () => {
    const cache = createVisibleGraphCache();
    const seventhResult = createVisibleResult();

    for (let index = 1; index <= 6; index += 1) {
      cacheVisibleGraphResult(cache, `key-${index}`, createVisibleResult());
    }

    cacheVisibleGraphResult(cache, 'key-7', seventhResult);

    expect(cache.entries.size).toBe(6);
    expect(cache.entries.has('key-1')).toBe(false);
    expect(cache.entries.has('key-2')).toBe(true);
    expect(cache.entries.get('key-7')).toBe(seventhResult);
  });
});

function createVisibleResult(): VisibleGraphResult {
  return {
    graphData: {
      nodes: [],
      edges: [],
    },
    regexError: null,
  };
}
