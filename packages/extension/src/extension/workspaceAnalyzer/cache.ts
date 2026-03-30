/**
 * @fileoverview Cache helpers for workspace analysis state.
 * @module extension/workspaceAnalysisCache
 */

import type { IConnection } from '../../core/plugins/types/contracts';

export interface ICachedWorkspaceFile {
  mtime: number;
  connections: IConnection[];
  size?: number;
}

export interface IWorkspaceAnalysisCache {
  version: string;
  files: Record<string, ICachedWorkspaceFile>;
}

export const WORKSPACE_ANALYSIS_CACHE_KEY = 'codegraphy.analysisCache';
export const WORKSPACE_ANALYSIS_CACHE_VERSION = '1.9.0';

export function createEmptyWorkspaceAnalysisCache(): IWorkspaceAnalysisCache {
  return {
    version: WORKSPACE_ANALYSIS_CACHE_VERSION,
    files: {},
  };
}

export function loadWorkspaceAnalysisCache(
  cached: IWorkspaceAnalysisCache | undefined
): IWorkspaceAnalysisCache {
  if (cached && cached.version === WORKSPACE_ANALYSIS_CACHE_VERSION) {
    console.log(`[CodeGraphy] Loaded cache: ${Object.keys(cached.files).length} files`);
    return cached;
  }

  return createEmptyWorkspaceAnalysisCache();
}

export function saveWorkspaceAnalysisCache(
  update: (key: string, value: IWorkspaceAnalysisCache) => unknown,
  cache: IWorkspaceAnalysisCache
): void {
  update(WORKSPACE_ANALYSIS_CACHE_KEY, cache);
}
