import {
  BASELINE_ANALYSIS_CACHE_TIER,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  type AnalysisCacheTier,
  type AnalysisCacheTierOptions,
} from '@codegraphy-dev/core';

export function createWorkspacePipelineAnalysisCacheTiers(
  nodeVisibility: Readonly<Record<string, boolean>>,
): AnalysisCacheTierOptions {
  const activeTiers: AnalysisCacheTier[] = [BASELINE_ANALYSIS_CACHE_TIER];
  if (nodeVisibility.symbol === true) {
    activeTiers.push(SYMBOLS_ANALYSIS_CACHE_TIER);
  }

  return {
    active: activeTiers,
    completed: activeTiers,
    required: activeTiers,
  };
}
