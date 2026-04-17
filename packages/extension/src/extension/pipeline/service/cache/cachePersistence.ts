import type { IWorkspaceAnalysisCache } from '../../cache';
import { clearWorkspacePipelineCache } from '../../analysis/state';
import { saveWorkspaceAnalysisDatabaseCache } from '../../database/cache/storage';

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

  try {
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache);
  } catch (error) {
    warn('[CodeGraphy] Failed to persist repo-local analysis cache.', error);
  }
}
