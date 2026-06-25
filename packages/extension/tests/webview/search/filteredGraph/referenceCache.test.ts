import { describe, expect, it } from 'vitest';
import {
  cacheReferenceResult,
  createReferenceResultCache,
  getReferenceResult,
} from '../../../../src/webview/search/filteredGraph/referenceCache';

describe('webview/search/filteredGraph/referenceCache', () => {
  it('returns cached results for the same reference and key', () => {
    const cache = createReferenceResultCache<string>();
    const reference = {};

    cacheReferenceResult(cache, reference, 'visible', 'cached graph');

    expect(getReferenceResult(cache, reference, 'visible')).toBe('cached graph');
  });

  it('keeps results isolated by reference object', () => {
    const cache = createReferenceResultCache<string>();
    const firstReference = {};
    const secondReference = {};

    cacheReferenceResult(cache, firstReference, 'visible', 'first graph');
    cacheReferenceResult(cache, secondReference, 'visible', 'second graph');

    expect(getReferenceResult(cache, firstReference, 'visible')).toBe('first graph');
    expect(getReferenceResult(cache, secondReference, 'visible')).toBe('second graph');
  });

  it('assigns increasing ids to new reference objects', () => {
    const cache = createReferenceResultCache<string>();

    cacheReferenceResult(cache, {}, 'visible', 'first graph');
    cacheReferenceResult(cache, {}, 'visible', 'second graph');

    expect(cache.nextReferenceId).toBe(3);
  });

  it('keeps results isolated by key for the same reference', () => {
    const cache = createReferenceResultCache<string>();
    const reference = {};

    cacheReferenceResult(cache, reference, 'visible', 'visible graph');
    cacheReferenceResult(cache, reference, 'styled', 'styled graph');

    expect(getReferenceResult(cache, reference, 'visible')).toBe('visible graph');
    expect(getReferenceResult(cache, reference, 'styled')).toBe('styled graph');
  });

  it('replaces an existing result and moves it to the newest cache slot', () => {
    const cache = createReferenceResultCache<string>();
    const reference = {};

    cacheReferenceResult(cache, reference, 'first', 'stale first');
    cacheReferenceResult(cache, reference, 'second', 'second');
    cacheReferenceResult(cache, reference, 'third', 'third');
    cacheReferenceResult(cache, reference, 'fourth', 'fourth');
    cacheReferenceResult(cache, reference, 'fifth', 'fifth');
    cacheReferenceResult(cache, reference, 'sixth', 'sixth');
    cacheReferenceResult(cache, reference, 'first', 'fresh first');
    cacheReferenceResult(cache, reference, 'seventh', 'seventh');

    expect(getReferenceResult(cache, reference, 'first')).toBe('fresh first');
    expect(getReferenceResult(cache, reference, 'second')).toBeUndefined();
    expect(getReferenceResult(cache, reference, 'seventh')).toBe('seventh');
  });

  it('evicts the oldest entries after six cached results', () => {
    const cache = createReferenceResultCache<string>();
    const reference = {};

    for (let index = 1; index <= 7; index += 1) {
      cacheReferenceResult(cache, reference, `key-${index}`, `result-${index}`);
    }

    expect(getReferenceResult(cache, reference, 'key-1')).toBeUndefined();
    expect(getReferenceResult(cache, reference, 'key-2')).toBe('result-2');
    expect(getReferenceResult(cache, reference, 'key-7')).toBe('result-7');
  });
});
