import {
  loadWorkspaceAnalysisDatabaseCache as loadWorkspaceAnalysisDatabaseCacheImpl,
  loadWorkspaceAnalysisDatabaseCacheAsync as loadWorkspaceAnalysisDatabaseCacheAsyncImpl,
} from './io/load';
import { getWorkspaceAnalysisDatabasePath as getWorkspaceAnalysisDatabasePathImpl } from './io/paths';
import {
  readWorkspaceAnalysisDatabaseSnapshot as readWorkspaceAnalysisDatabaseSnapshotImpl,
  type WorkspaceAnalysisDatabaseSnapshot as WorkspaceAnalysisDatabaseSnapshotImpl,
} from './snapshot';
import {
  clearWorkspaceAnalysisDatabaseCache as clearWorkspaceAnalysisDatabaseCacheImpl,
  patchWorkspaceAnalysisDatabaseCache as patchWorkspaceAnalysisDatabaseCacheImpl,
  saveWorkspaceAnalysisDatabaseCache as saveWorkspaceAnalysisDatabaseCacheImpl,
  saveWorkspaceAnalysisDatabaseCacheAsync as saveWorkspaceAnalysisDatabaseCacheAsyncImpl,
  type WorkspaceAnalysisDatabasePatch,
  type WorkspaceAnalysisDatabaseSaveOptions,
} from './io/save';

export type WorkspaceAnalysisDatabaseSnapshot = WorkspaceAnalysisDatabaseSnapshotImpl;

export function getWorkspaceAnalysisDatabasePath(
  workspaceRoot: string,
): string {
  return getWorkspaceAnalysisDatabasePathImpl(workspaceRoot);
}

export function loadWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
) {
  return loadWorkspaceAnalysisDatabaseCacheImpl(workspaceRoot);
}

export function loadWorkspaceAnalysisDatabaseCacheAsync(
  workspaceRoot: string,
) {
  return loadWorkspaceAnalysisDatabaseCacheAsyncImpl(workspaceRoot);
}

export function readWorkspaceAnalysisDatabaseSnapshot(
  workspaceRoot: string,
): WorkspaceAnalysisDatabaseSnapshot {
  return readWorkspaceAnalysisDatabaseSnapshotImpl(workspaceRoot);
}

export function clearWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
): void {
  clearWorkspaceAnalysisDatabaseCacheImpl(workspaceRoot);
}

export function saveWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
  cache: Parameters<typeof saveWorkspaceAnalysisDatabaseCacheImpl>[1],
): void {
  saveWorkspaceAnalysisDatabaseCacheImpl(workspaceRoot, cache);
}

export function patchWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
  patch: WorkspaceAnalysisDatabasePatch,
): void {
  patchWorkspaceAnalysisDatabaseCacheImpl(workspaceRoot, patch);
}

export function saveWorkspaceAnalysisDatabaseCacheAsync(
  workspaceRoot: string,
  cache: Parameters<typeof saveWorkspaceAnalysisDatabaseCacheImpl>[1],
  options?: WorkspaceAnalysisDatabaseSaveOptions,
): Promise<void> {
  return saveWorkspaceAnalysisDatabaseCacheAsyncImpl(workspaceRoot, cache, options);
}
