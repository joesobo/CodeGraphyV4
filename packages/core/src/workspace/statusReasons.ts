import { WORKSPACE_ANALYSIS_CACHE_VERSION } from '../analysis/cache';
import type { CodeGraphyWorkspaceStaleReason } from './statusContracts';

export function collectCodeGraphyWorkspaceStaleReasons(input: {
  hasGraphCache: boolean;
  indexedAt: string | null;
  metaPluginSignature: string | null;
  metaSettingsSignature: string | null;
  metaAnalysisVersion: string | null;
  pendingChangedFiles: readonly string[];
  pluginSignature: string | null;
  settingsSignature: string;
}): CodeGraphyWorkspaceStaleReason[] {
  if (!input.hasGraphCache) {
    return input.indexedAt === null ? ['never-indexed'] : ['graph-cache-missing'];
  }

  if (input.indexedAt === null) {
    return ['never-indexed'];
  }

  return [
    ...(input.pendingChangedFiles.length > 0 ? ['pending-changed-files' as const] : []),
    ...(input.metaPluginSignature !== input.pluginSignature ? ['plugin-signature-changed' as const] : []),
    ...(input.metaSettingsSignature !== input.settingsSignature ? ['settings-signature-changed' as const] : []),
    ...(input.metaAnalysisVersion !== WORKSPACE_ANALYSIS_CACHE_VERSION ? ['analysis-version-changed' as const] : []),
  ];
}
