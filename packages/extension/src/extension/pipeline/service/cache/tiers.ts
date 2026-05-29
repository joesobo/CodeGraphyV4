import {
  BASELINE_ANALYSIS_CACHE_TIER,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  createPluginAnalysisCacheTier,
  type AnalysisCacheTier,
  type AnalysisCacheTierOptions,
} from '@codegraphy-dev/core';

export function createWorkspacePipelineAnalysisCacheTiers(
  nodeVisibility: Readonly<Record<string, boolean>>,
  pluginIds: readonly string[] = [],
): AnalysisCacheTierOptions {
  const activeTiers: AnalysisCacheTier[] = [BASELINE_ANALYSIS_CACHE_TIER];
  if (nodeVisibility.symbol === true) {
    activeTiers.push(SYMBOLS_ANALYSIS_CACHE_TIER);
  }
  activeTiers.push(...pluginIds.map(createPluginAnalysisCacheTier));

  return {
    active: activeTiers,
    completed: activeTiers,
    required: activeTiers,
  };
}
