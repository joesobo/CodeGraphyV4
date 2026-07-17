import {
  clearWorkspaceAnalysisDatabaseCache,
  patchWorkspaceAnalysisDatabaseCache as patchWorkspaceAnalysisDatabaseCacheCore,
  saveWorkspaceAnalysisDatabaseCacheAsync as saveWorkspaceAnalysisDatabaseCacheAsyncCore,
} from '@codegraphy-dev/core';
import { enqueueWorkspaceCacheWrite } from './writeQueue';

export type { WorkspaceAnalysisDatabaseSnapshot } from '@codegraphy-dev/core';
export {
  getWorkspaceAnalysisDatabasePath,
  loadWorkspaceAnalysisDatabaseCache,
  loadWorkspaceAnalysisDatabaseCacheAsync,
  readWorkspaceAnalysisDatabaseSnapshot,
  saveWorkspaceAnalysisDatabaseCache,
} from '@codegraphy-dev/core';

export function clearWorkspaceAnalysisDatabaseCacheQueued(workspaceRoot: string): Promise<void> {
  return enqueueWorkspaceCacheWrite(workspaceRoot, 'clear', async () => {
    clearWorkspaceAnalysisDatabaseCache(workspaceRoot);
  });
}

export function patchWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
  patch: Parameters<typeof patchWorkspaceAnalysisDatabaseCacheCore>[1],
): Promise<void> {
  return enqueueWorkspaceCacheWrite(workspaceRoot, 'patch', async () => {
    patchWorkspaceAnalysisDatabaseCacheCore(workspaceRoot, patch);
  });
}

export function saveWorkspaceAnalysisDatabaseCacheAsync(
  workspaceRoot: string,
  cache: Parameters<typeof saveWorkspaceAnalysisDatabaseCacheAsyncCore>[1],
  options?: Parameters<typeof saveWorkspaceAnalysisDatabaseCacheAsyncCore>[2],
): Promise<void> {
  const cacheSnapshot = {
    ...cache,
    files: { ...cache.files },
  };
  return enqueueWorkspaceCacheWrite(workspaceRoot, 'full', () =>
    saveWorkspaceAnalysisDatabaseCacheAsyncCore(workspaceRoot, cacheSnapshot, options));
}
