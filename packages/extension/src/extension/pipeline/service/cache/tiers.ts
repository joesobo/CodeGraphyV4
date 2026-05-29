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
  if (requiresSymbolAnalysisCacheTier(nodeVisibility)) {
    activeTiers.push(SYMBOLS_ANALYSIS_CACHE_TIER);
  }
  activeTiers.push(...pluginIds.map(createPluginAnalysisCacheTier));

  return {
    active: activeTiers,
    completed: activeTiers,
    required: activeTiers,
  };
}

function isSymbolScopedNodeType(nodeType: string): boolean {
  return nodeType === 'symbol'
    || nodeType === 'variable'
    || nodeType.startsWith('symbol:')
    || (nodeType.startsWith('plugin:') && nodeType.includes(':symbol:'));
}

export function requiresSymbolAnalysisCacheTier(
  nodeVisibility: Readonly<Record<string, boolean>>,
): boolean {
  return Object.entries(nodeVisibility).some(([nodeType, visible]) =>
    visible === true && isSymbolScopedNodeType(nodeType),
  );
}
