import { loadWorkspaceAnalysisDatabaseCache as loadWorkspaceAnalysisDatabaseCacheImpl } from './load';
import { getWorkspaceAnalysisDatabasePath as getWorkspaceAnalysisDatabasePathImpl } from './paths';
import {
  readWorkspaceAnalysisDatabaseSnapshot as readWorkspaceAnalysisDatabaseSnapshotImpl,
  type WorkspaceAnalysisDatabaseSnapshot as WorkspaceAnalysisDatabaseSnapshotImpl,
} from './snapshot';
import {
  clearWorkspaceAnalysisDatabaseCache as clearWorkspaceAnalysisDatabaseCacheImpl,
  saveWorkspaceAnalysisDatabaseCache as saveWorkspaceAnalysisDatabaseCacheImpl,
} from './save';

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
