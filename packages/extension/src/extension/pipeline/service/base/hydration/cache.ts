import {
  BASELINE_ANALYSIS_CACHE_TIER,
  hasRequiredAnalysisCacheTiers,
  isAnalysisCacheTier,
  readAnalysisCacheTiers,
  sortAnalysisCacheTiers,
  type AnalysisCacheTier,
} from '@codegraphy-dev/core';
import type { IWorkspaceAnalysisCache } from '../../../cache';

export const DEFAULT_GRAPH_CACHE_HYDRATION_TIERS = [
  BASELINE_ANALYSIS_CACHE_TIER,
] as const;

export function hasCacheFiles(cache: IWorkspaceAnalysisCache): boolean {
  return Object.keys(cache.files).length > 0;
}

export function hasHydratedAnalysisCacheTiers(
  cache: IWorkspaceAnalysisCache,
  tiers: readonly AnalysisCacheTier[],
): boolean {
  return hasCacheFiles(cache)
    && Object.values(cache.files).every(entry =>
      hasRequiredAnalysisCacheTiers(entry.analysis, tiers),
    );
}

export function createRuntimeHydrationCacheTiers(
  cache: IWorkspaceAnalysisCache,
  requestedTiers: readonly AnalysisCacheTier[],
): readonly AnalysisCacheTier[] {
  const tiers = new Set<AnalysisCacheTier>([
    BASELINE_ANALYSIS_CACHE_TIER,
    ...requestedTiers,
  ]);
  for (const entry of Object.values(cache.files)) {
    for (const tier of readAnalysisCacheTiers(entry.analysis)) {
      if (isAnalysisCacheTier(tier)) tiers.add(tier);
    }
  }
  return sortAnalysisCacheTiers(tiers);
}
