const REFERENCE_RESULT_CACHE_LIMIT = 6;

export interface ReferenceResultCache<TValue> {
  entries: Map<string, TValue>;
  nextReferenceId: number;
  referenceIds: WeakMap<object, number>;
}

export function createReferenceResultCache<TValue>(): ReferenceResultCache<TValue> {
  return {
    entries: new Map(),
    nextReferenceId: 1,
    referenceIds: new WeakMap(),
  };
}

export function getReferenceResult<TValue>(
  cache: ReferenceResultCache<TValue>,
  reference: object,
  key: string,
): TValue | undefined {
  return cache.entries.get(getReferenceResultCacheKey(cache, reference, key));
}

export function cacheReferenceResult<TValue>(
  cache: ReferenceResultCache<TValue>,
  reference: object,
  key: string,
  result: TValue,
): void {
  const cacheKey = getReferenceResultCacheKey(cache, reference, key);
  cache.entries.delete(cacheKey);
  cache.entries.set(cacheKey, result);

  while (cache.entries.size > REFERENCE_RESULT_CACHE_LIMIT) {
    const oldestKey = cache.entries.keys().next().value as string;
    cache.entries.delete(oldestKey);
  }
}

function getReferenceResultCacheKey<TValue>(
  cache: ReferenceResultCache<TValue>,
  reference: object,
  key: string,
): string {
  return `${getReferenceId(cache, reference)}:${key}`;
}

function getReferenceId<TValue>(
  cache: ReferenceResultCache<TValue>,
  reference: object,
): number {
  const existing = cache.referenceIds.get(reference);
  if (existing !== undefined) {
    return existing;
  }

  const id = cache.nextReferenceId;
  cache.nextReferenceId += 1;
  cache.referenceIds.set(reference, id);
  return id;
}
