import { describe, expect, it } from 'vitest';
import {
  BASELINE_ANALYSIS_CACHE_TIER,
  SYMBOLS_ANALYSIS_CACHE_TIER,
} from '@codegraphy-dev/core';
import {
  createRuntimeHydrationCacheTiers,
  hasCacheFiles,
  hasHydratedAnalysisCacheTiers,
} from '../../../../src/extension/pipeline/cacheHydration/tiers';
import type { IWorkspaceAnalysisCache } from '../../../../src/extension/pipeline/cache';

function cacheWithTiers(tiers: readonly string[]): IWorkspaceAnalysisCache {
  const analysis = {
    filePath: '/workspace/src/app.ts',
    relations: [],
    cache: { tiers },
  };
  return {
    version: '2.1.0',
    files: {
      'src/app.ts': {
        mtime: 1,
        analysis,
      },
    },
  };
}

describe('Graph Cache hydration tiers', () => {
  it('does not treat an empty cache as hydrated', () => {
    const empty: IWorkspaceAnalysisCache = { version: '2.1.0', files: {} };

    expect(hasCacheFiles(empty)).toBe(false);
    expect(hasHydratedAnalysisCacheTiers(empty, [BASELINE_ANALYSIS_CACHE_TIER])).toBe(false);
  });

  it('requires every cached file to contain every requested tier', () => {
    const cache = cacheWithTiers([BASELINE_ANALYSIS_CACHE_TIER]);

    expect(hasHydratedAnalysisCacheTiers(cache, [BASELINE_ANALYSIS_CACHE_TIER])).toBe(true);
    expect(hasHydratedAnalysisCacheTiers(
      cache,
      [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
    )).toBe(false);
  });

  it('retains valid resident tiers while adding requested tiers in stable order', () => {
    expect(createRuntimeHydrationCacheTiers(
      cacheWithTiers([BASELINE_ANALYSIS_CACHE_TIER, 'plugin:codegraphy.vue', 'unknown']),
      [SYMBOLS_ANALYSIS_CACHE_TIER, 'plugin:codegraphy.unity'],
    )).toEqual([
      BASELINE_ANALYSIS_CACHE_TIER,
      SYMBOLS_ANALYSIS_CACHE_TIER,
      'plugin:codegraphy.unity',
      'plugin:codegraphy.vue',
    ]);
  });
});
