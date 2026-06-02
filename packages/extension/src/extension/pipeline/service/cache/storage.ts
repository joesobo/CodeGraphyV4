import type { IWorkspaceAnalysisCache } from '../../cache';
import { clearWorkspacePipelineCache } from '../../analysis/state';
import { saveWorkspaceAnalysisDatabaseCacheAsync } from '../../database/cache/storage';

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
