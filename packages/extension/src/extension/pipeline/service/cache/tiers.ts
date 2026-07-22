import {
  createWorkspaceIndexAnalysisCacheTiers,
  type AnalysisCacheTierOptions,
  requiresSymbolAnalysisCacheTier as coreRequiresSymbolAnalysisCacheTier,
} from '@codegraphy-dev/core';

export function createWorkspacePipelineAnalysisCacheTiers(
  pluginIds: readonly string[] = [],
): AnalysisCacheTierOptions {
  return createWorkspaceIndexAnalysisCacheTiers(pluginIds);
}

export function requiresSymbolAnalysisCacheTier(
  nodeVisibility: Readonly<Record<string, boolean>>,
): boolean {
  return coreRequiresSymbolAnalysisCacheTier(nodeVisibility);
}
