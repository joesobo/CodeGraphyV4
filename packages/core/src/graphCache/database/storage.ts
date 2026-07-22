import {
  loadWorkspaceAnalysisDatabaseCache as loadWorkspaceAnalysisDatabaseCacheImpl,
  loadWorkspaceAnalysisDatabaseCacheAsync as loadWorkspaceAnalysisDatabaseCacheAsyncImpl,
  type WorkspaceAnalysisDatabaseLoadOptions,
} from './io/load';
import { getWorkspaceAnalysisDatabasePath as getWorkspaceAnalysisDatabasePathImpl } from './io/paths';
import {
  inspectWorkspaceAnalysisDatabase as inspectWorkspaceAnalysisDatabaseImpl,
  type WorkspaceAnalysisDatabaseInspection as WorkspaceAnalysisDatabaseInspectionImpl,
} from './inspection/model';
import {
  readWorkspaceAnalysisDatabaseRecordCounts as readWorkspaceAnalysisDatabaseRecordCountsImpl,
} from './recordCounts/model';
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
export type WorkspaceAnalysisDatabaseInspection = WorkspaceAnalysisDatabaseInspectionImpl;
export type { WorkspaceAnalysisDatabaseLoadOptions };

export function getWorkspaceAnalysisDatabasePath(
  workspaceRoot: string,
): string {
  return getWorkspaceAnalysisDatabasePathImpl(workspaceRoot);
}

export function readWorkspaceAnalysisDatabaseRecordCounts(workspaceRoot: string) {
  return readWorkspaceAnalysisDatabaseRecordCountsImpl(workspaceRoot);
}

export function inspectWorkspaceAnalysisDatabase(
  workspaceRoot: string,
): WorkspaceAnalysisDatabaseInspection {
  return inspectWorkspaceAnalysisDatabaseImpl(workspaceRoot);
}

export function loadWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
  options?: WorkspaceAnalysisDatabaseLoadOptions,
) {
  return loadWorkspaceAnalysisDatabaseCacheImpl(workspaceRoot, options);
}

export function loadWorkspaceAnalysisDatabaseCacheAsync(
  workspaceRoot: string,
  options?: WorkspaceAnalysisDatabaseLoadOptions,
) {
  return loadWorkspaceAnalysisDatabaseCacheAsyncImpl(workspaceRoot, options);
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
  graph?: Parameters<typeof saveWorkspaceAnalysisDatabaseCacheImpl>[2],
): void {
  saveWorkspaceAnalysisDatabaseCacheImpl(workspaceRoot, cache, graph);
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
