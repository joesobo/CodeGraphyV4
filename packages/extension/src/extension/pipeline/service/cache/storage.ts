import type { IWorkspaceAnalysisCache } from '../../cache';
import { clearWorkspacePipelineCache } from '../../analysis/state';
import {
  patchWorkspaceAnalysisDatabaseCache,
  saveWorkspaceAnalysisDatabaseCacheAsync,
} from '../../database/cache/storage';

export interface WorkspacePipelineCachePatch {
  deleteFilePaths: readonly string[];
  upsertFilePaths: readonly string[];
}

export function clearWorkspacePipelineStoredCache(
  workspaceRoot: string | undefined,
  logInfo: (message: string) => void,
): IWorkspaceAnalysisCache {
  return clearWorkspacePipelineCache(workspaceRoot, logInfo);
}

export function persistWorkspacePipelineCache(
  workspaceRoot: string | undefined,
  cache: IWorkspaceAnalysisCache,
  warn: (message: string, error: unknown) => void,
): void {
  if (!workspaceRoot) {
    return;
  }

  void saveWorkspaceAnalysisDatabaseCacheAsync(workspaceRoot, cache)
    .catch((error: unknown) => {
      warn('[CodeGraphy] Failed to persist repo-local analysis cache.', error);
    });
}

export function patchWorkspacePipelineCache(
  workspaceRoot: string | undefined,
  cache: IWorkspaceAnalysisCache,
  patch: WorkspacePipelineCachePatch,
  warn: (message: string, error: unknown) => void,
): void {
  if (!workspaceRoot) {
    return;
  }

  const upsertFiles: IWorkspaceAnalysisCache['files'] = {};
  for (const filePath of patch.upsertFilePaths) {
    const entry = cache.files[filePath];
    if (entry) {
      upsertFiles[filePath] = entry;
    }
  }

  try {
    patchWorkspaceAnalysisDatabaseCache(workspaceRoot, {
      deleteFilePaths: patch.deleteFilePaths,
      upsertFiles,
    });
  } catch (error) {
    warn('[CodeGraphy] Failed to patch repo-local analysis cache.', error);
  }
}
