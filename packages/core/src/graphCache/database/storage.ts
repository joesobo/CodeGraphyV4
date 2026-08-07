import {
  loadWorkspaceAnalysisDatabaseCache as loadWorkspaceAnalysisDatabaseCacheImpl,
  loadWorkspaceAnalysisDatabaseCacheAsync as loadWorkspaceAnalysisDatabaseCacheAsyncImpl,
  WorkspaceAnalysisDatabaseUnreadableError,
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
  readWorkspaceAnalysisDatabaseFileGraph as readWorkspaceAnalysisDatabaseFileGraphImpl,
  readWorkspaceAnalysisDatabaseGraph as readWorkspaceAnalysisDatabaseGraphImpl,
  readWorkspaceAnalysisDatabaseSnapshot as readWorkspaceAnalysisDatabaseSnapshotImpl,
  type WorkspaceAnalysisDatabaseSnapshot as WorkspaceAnalysisDatabaseSnapshotImpl,
} from './snapshot';
import {
  clearWorkspaceAnalysisDatabaseCache as clearWorkspaceAnalysisDatabaseCacheImpl,
  clearWorkspaceAnalysisDatabaseCacheAsync as clearWorkspaceAnalysisDatabaseCacheAsyncImpl,
  patchOwnedWorkspaceAnalysisDatabaseCache as patchOwnedWorkspaceAnalysisDatabaseCacheImpl,
  patchWorkspaceAnalysisDatabaseCache as patchWorkspaceAnalysisDatabaseCacheImpl,
  patchWorkspaceAnalysisDatabaseCacheAsync as patchWorkspaceAnalysisDatabaseCacheAsyncImpl,
  replaceOwnedWorkspaceAnalysisDatabaseCache as replaceOwnedWorkspaceAnalysisDatabaseCacheImpl,
  saveWorkspaceAnalysisDatabaseCache as saveWorkspaceAnalysisDatabaseCacheImpl,
  saveWorkspaceAnalysisDatabaseCacheAsync as saveWorkspaceAnalysisDatabaseCacheAsyncImpl,
  type WorkspaceAnalysisDatabasePatch,
  type WorkspaceAnalysisDatabaseReplacement,
  type WorkspaceAnalysisDatabaseSaveOptions,
} from './io/save';
import { withWorkspaceCacheWriteOwnershipAsync } from './writeCoordination/model';

export type WorkspaceAnalysisDatabaseSnapshot = WorkspaceAnalysisDatabaseSnapshotImpl;
export type WorkspaceAnalysisDatabaseInspection = WorkspaceAnalysisDatabaseInspectionImpl;
export { WorkspaceAnalysisDatabaseUnreadableError };
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

export function readWorkspaceAnalysisDatabaseGraph(workspaceRoot: string) {
  return readWorkspaceAnalysisDatabaseGraphImpl(workspaceRoot);
}

export function readWorkspaceAnalysisDatabaseFileGraph(workspaceRoot: string) {
  return readWorkspaceAnalysisDatabaseFileGraphImpl(workspaceRoot);
}

export function clearWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
): void {
  clearWorkspaceAnalysisDatabaseCacheImpl(workspaceRoot);
}

export function clearWorkspaceAnalysisDatabaseCacheAsync(
  workspaceRoot: string,
): Promise<void> {
  return clearWorkspaceAnalysisDatabaseCacheAsyncImpl(workspaceRoot);
}

export function saveWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
  cache: Parameters<typeof saveWorkspaceAnalysisDatabaseCacheImpl>[1],
  graph?: Parameters<typeof saveWorkspaceAnalysisDatabaseCacheImpl>[2],
  nodeTypes?: Parameters<typeof saveWorkspaceAnalysisDatabaseCacheImpl>[3],
): void {
  saveWorkspaceAnalysisDatabaseCacheImpl(workspaceRoot, cache, graph, nodeTypes);
}

export function patchWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
  patch: WorkspaceAnalysisDatabasePatch,
): void {
  patchWorkspaceAnalysisDatabaseCacheImpl(workspaceRoot, patch);
}

export function patchWorkspaceAnalysisDatabaseCacheAsync(
  workspaceRoot: string,
  patch: WorkspaceAnalysisDatabasePatch,
): Promise<void> {
  return patchWorkspaceAnalysisDatabaseCacheAsyncImpl(workspaceRoot, patch);
}

interface WorkspaceAnalysisDatabaseWriter {
  readonly revision: string;
  patch(
    patch: WorkspaceAnalysisDatabasePatch,
    recovery: WorkspaceAnalysisDatabaseReplacement,
  ): void;
  replace(replacement: WorkspaceAnalysisDatabaseReplacement): void;
}

export function withWorkspaceAnalysisDatabaseWriter<T>(
  workspaceRoot: string,
  write: (writer: WorkspaceAnalysisDatabaseWriter) => Promise<T>,
): Promise<T> {
  return withWorkspaceCacheWriteOwnershipAsync(
    getWorkspaceAnalysisDatabasePathImpl(workspaceRoot),
    context => write({
      revision: context.revision,
      patch: (patch, recovery) => {
        context.assertCurrent();
        patchOwnedWorkspaceAnalysisDatabaseCacheImpl(workspaceRoot, patch, recovery);
      },
      replace: replacement => {
        context.assertCurrent();
        replaceOwnedWorkspaceAnalysisDatabaseCacheImpl(workspaceRoot, replacement);
      },
    }),
  );
}

export function saveWorkspaceAnalysisDatabaseCacheAsync(
  workspaceRoot: string,
  cache: Parameters<typeof saveWorkspaceAnalysisDatabaseCacheImpl>[1],
  options?: WorkspaceAnalysisDatabaseSaveOptions,
): Promise<void> {
  return saveWorkspaceAnalysisDatabaseCacheAsyncImpl(workspaceRoot, cache, options);
}
