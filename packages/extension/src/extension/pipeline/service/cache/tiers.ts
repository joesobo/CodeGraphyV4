import {
  createWorkspaceIndexAnalysisCacheTiers,
  type AnalysisCacheTierOptions,
  requiresSymbolAnalysisCacheTier as coreRequiresSymbolAnalysisCacheTier,
} from '@codegraphy-dev/core';

export function createWorkspacePipelineAnalysisCacheTiers(
  nodeVisibility: Readonly<Record<string, boolean>>,
  pluginIds: readonly string[] = [],
): AnalysisCacheTierOptions {
  return createWorkspaceIndexAnalysisCacheTiers(nodeVisibility, pluginIds);
}

export function requiresSymbolAnalysisCacheTier(
  nodeVisibility: Readonly<Record<string, boolean>>,
): boolean {
  return coreRequiresSymbolAnalysisCacheTier(nodeVisibility);
}
