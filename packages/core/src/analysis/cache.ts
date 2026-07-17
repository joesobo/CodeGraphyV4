/**
 * @fileoverview Cache helpers for workspace analysis state.
 * @module core/workspaceAnalysisCache
 */

import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { createHash } from 'node:crypto';

export interface ICachedWorkspaceFile {
  mtime: number;
  analysis: IFileAnalysisResult;
  contentHash?: string;
  size?: number;
}

export interface IWorkspaceAnalysisCache {
  version: string;
  files: Record<string, ICachedWorkspaceFile>;
}

export const WORKSPACE_ANALYSIS_CACHE_KEY = 'codegraphy.analysisCache';
export const WORKSPACE_ANALYSIS_CACHE_VERSION = '2.2.0';

export function createWorkspaceFileContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function hasAmbiguousWorkspaceFileTimestamp(mtime: number | undefined): boolean {
  return mtime === undefined || Number.isInteger(mtime);
}

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
