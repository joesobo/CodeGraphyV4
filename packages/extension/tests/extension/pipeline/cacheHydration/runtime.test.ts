import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BASELINE_ANALYSIS_CACHE_TIER,
  markAnalysisCacheTiers,
} from '@codegraphy-dev/core';
import { WorkspacePipelineCacheHydrator } from '../../../../src/extension/pipeline/cacheHydration/runtime';
import type { IWorkspaceAnalysisCache } from '../../../../src/extension/pipeline/cache';

const hydrationHarness = vi.hoisted(() => ({
  loadWorkspaceAnalysisDatabaseCache: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/database/cache/storage.ts', () => ({
  loadWorkspaceAnalysisDatabaseCache: hydrationHarness.loadWorkspaceAnalysisDatabaseCache,
}));

function emptyCache(): IWorkspaceAnalysisCache {
  return { version: '2.1.0', files: {} };
}

function populatedCache(path = 'src/app.ts'): IWorkspaceAnalysisCache {
  return {
    version: '2.1.0',
    files: {
      [path]: {
        mtime: 1,
        analysis: markAnalysisCacheTiers({
          filePath: `/workspace/${path}`,
          relations: [],
        }, [BASELINE_ANALYSIS_CACHE_TIER]),
      },
    },
  };
}

describe('Graph Cache hydration runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shares an in-flight load between callers', async () => {
    let resolveLoad!: (cache: ReturnType<typeof populatedCache>) => void;
    hydrationHarness.loadWorkspaceAnalysisDatabaseCache.mockReturnValueOnce(
      new Promise(resolve => { resolveLoad = resolve; }),
    );
    let current = emptyCache();
    const access = { get: () => current, set: (cache: typeof current) => { current = cache; } };
    const hydrator = new WorkspacePipelineCacheHydrator();

    const first = hydrator.hydrate('/workspace', [BASELINE_ANALYSIS_CACHE_TIER], access);
    const second = hydrator.hydrate('/workspace', [BASELINE_ANALYSIS_CACHE_TIER], access);
    await vi.waitFor(() => expect(hydrationHarness.loadWorkspaceAnalysisDatabaseCache).toHaveBeenCalledOnce());
    resolveLoad(populatedCache());
    await Promise.all([first, second]);

    expect(hydrationHarness.loadWorkspaceAnalysisDatabaseCache).toHaveBeenCalledOnce();
    expect(current).toEqual(populatedCache());
  });

  it('does not overwrite memory populated while an initially empty cache is loading', async () => {
    let resolveLoad!: (cache: ReturnType<typeof populatedCache>) => void;
    hydrationHarness.loadWorkspaceAnalysisDatabaseCache.mockReturnValueOnce(
      new Promise(resolve => { resolveLoad = resolve; }),
    );
    let current = emptyCache();
    const access = { get: () => current, set: (cache: typeof current) => { current = cache; } };
    const hydrator = new WorkspacePipelineCacheHydrator();

    const hydration = hydrator.hydrate('/workspace', [BASELINE_ANALYSIS_CACHE_TIER], access);
    await vi.waitFor(() => expect(hydrationHarness.loadWorkspaceAnalysisDatabaseCache).toHaveBeenCalledOnce());
    const liveCache = populatedCache('src/live.ts');
    current = liveCache;
    resolveLoad(populatedCache('src/stale.ts'));
    await hydration;

    expect(current).toBe(liveCache);
  });

  it('clears a completed empty load so a later request can retry', async () => {
    hydrationHarness.loadWorkspaceAnalysisDatabaseCache.mockReturnValue(emptyCache());
    let current = emptyCache();
    const access = { get: () => current, set: (cache: typeof current) => { current = cache; } };
    const hydrator = new WorkspacePipelineCacheHydrator();

    await hydrator.hydrate('/workspace', [BASELINE_ANALYSIS_CACHE_TIER], access);
    await hydrator.hydrate('/workspace', [BASELINE_ANALYSIS_CACHE_TIER], access);

    expect(hydrationHarness.loadWorkspaceAnalysisDatabaseCache).toHaveBeenCalledTimes(2);
  });
});
