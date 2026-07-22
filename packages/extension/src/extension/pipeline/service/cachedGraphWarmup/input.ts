import {
  createWorkspacePluginAnalysisContext,
  SYMBOLS_ANALYSIS_CACHE_TIER,
} from '@codegraphy-dev/core';
import { createWorkspacePipelineAnalysisCacheTiers } from '../cache/tiers';
import type {
  CachedGraphAnalysisWarmupInput,
  CachedGraphAnalysisWarmupOptions,
} from './contracts';
import { selectCachedGraphAnalysisWarmupFile } from './selection';

export function createCachedGraphAnalysisWarmupInput(
  options: CachedGraphAnalysisWarmupOptions,
): CachedGraphAnalysisWarmupInput | undefined {
  if (typeof options.registry.analyzeFileResultForPlugins !== 'function') {
    return undefined;
  }

  const file = selectCachedGraphAnalysisWarmupFile(options.registry, options.files);
  if (!file) {
    return undefined;
  }

  const disabledPluginSnapshot = new Set(options.disabledPlugins);
  const pluginIds = options.getActiveAnalysisPluginIds(disabledPluginSnapshot);
  const cacheTiers = createWorkspacePipelineAnalysisCacheTiers(
    pluginIds,
  );

  return {
    analysisContext: createWorkspacePluginAnalysisContext(options.workspaceRoot, {
      features: {
        symbols: cacheTiers.active === undefined
          || cacheTiers.active.includes(SYMBOLS_ANALYSIS_CACHE_TIER),
      },
    }),
    disabledPluginSnapshot,
    file,
    pluginIds,
    signal: options.signal,
    workspaceRoot: options.workspaceRoot,
  };
}
