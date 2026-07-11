import type { IWorkspaceAnalysisCache } from '../../cache';
import { clearWorkspacePipelineCache } from '../../analysis/state';
import {
  patchWorkspaceAnalysisDatabaseCacheAsync,
  saveWorkspaceAnalysisDatabaseCacheAsync,
} from '../../database/cache/storage';
import { createWorkspaceCachePersistenceScheduler } from '../../database/cache/scheduler';

const persistenceScheduler = createWorkspaceCachePersistenceScheduler({
  saveFull: saveWorkspaceAnalysisDatabaseCacheAsync,
  savePatch: patchWorkspaceAnalysisDatabaseCacheAsync,
  scheduleIdle: callback => setImmediate(callback),
  warn: (message, error) => console.warn(message, error),
});
const pendingFullSaveWorkspaceRoots = new Set<string>();

export function hasPendingWorkspacePipelineCacheSave(
  workspaceRoot: string | undefined,
): boolean {
  return workspaceRoot ? pendingFullSaveWorkspaceRoots.has(workspaceRoot) : false;
}

export function waitForWorkspacePipelineCachePersistence(
  workspaceRoot: string | undefined,
): Promise<void> {
  return workspaceRoot
    ? persistenceScheduler.whenIdle(workspaceRoot)
    : Promise.resolve();
}

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
  onProgress?: (progress: { current: number; total: number }) => void,
): void {
  if (!workspaceRoot) {
    return;
  }

  pendingFullSaveWorkspaceRoots.add(workspaceRoot);
  persistenceScheduler.scheduleFull(
    workspaceRoot,
    cache,
    onProgress,
    warn,
    () => pendingFullSaveWorkspaceRoots.delete(workspaceRoot),
  );
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

  persistenceScheduler.schedulePatch(workspaceRoot, {
    deleteFilePaths: patch.deleteFilePaths,
    upsertFiles,
  }, warn);
}
