interface ReplayableCacheAnalyzer {
  getIndexStatus?(): { freshness: string };
  loadCachedGraph?: unknown;
}

interface ReplayableCacheSource {
  _analyzer?: ReplayableCacheAnalyzer;
}

export function canReplayStaleCache(source: ReplayableCacheSource): boolean {
  return source._analyzer?.getIndexStatus?.().freshness === 'stale'
    && typeof source._analyzer.loadCachedGraph === 'function';
}
