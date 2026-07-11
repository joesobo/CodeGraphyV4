import type { IWorkspaceAnalysisCache } from '../../cache';

interface WorkspaceCachePatch {
  deleteFilePaths?: readonly string[];
  upsertFiles?: IWorkspaceAnalysisCache['files'];
}

interface PendingPatch {
  deleteFilePaths: Set<string>;
  upsertFiles: IWorkspaceAnalysisCache['files'];
  warn?: (message: string, error: unknown) => void;
}

interface PendingFullSave {
  cache: IWorkspaceAnalysisCache;
  onSettled?: (succeeded: boolean) => void;
  onProgress?: (progress: { current: number; total: number }) => void;
  warn?: (message: string, error: unknown) => void;
}

interface WorkspacePersistenceState {
  active: boolean;
  full?: PendingFullSave;
  patch?: PendingPatch;
  scheduled: boolean;
  waiters: Set<() => void>;
}

export interface WorkspaceCachePersistenceSchedulerDependencies {
  saveFull(
    workspaceRoot: string,
    cache: IWorkspaceAnalysisCache,
    options?: { onProgress?: (progress: { current: number; total: number }) => void },
  ): Promise<void>;
  savePatch(workspaceRoot: string, patch: WorkspaceCachePatch): Promise<void>;
  scheduleIdle(callback: () => void): void;
  warn(message: string, error: unknown): void;
}

export interface WorkspaceCachePersistenceScheduler {
  scheduleFull(
    workspaceRoot: string,
    cache: IWorkspaceAnalysisCache,
    onProgress?: (progress: { current: number; total: number }) => void,
    warn?: (message: string, error: unknown) => void,
    onSettled?: (succeeded: boolean) => void,
  ): void;
  schedulePatch(
    workspaceRoot: string,
    patch: WorkspaceCachePatch,
    warn?: (message: string, error: unknown) => void,
  ): void;
  whenIdle(workspaceRoot: string): Promise<void>;
}

function snapshotCache(cache: IWorkspaceAnalysisCache): IWorkspaceAnalysisCache {
  return { ...cache, files: { ...cache.files } };
}

function mergePatch(
  pending: PendingPatch | undefined,
  patch: WorkspaceCachePatch,
  warn?: (message: string, error: unknown) => void,
): PendingPatch {
  const merged = pending ?? { deleteFilePaths: new Set(), upsertFiles: {} };
  if (warn) {
    merged.warn = warn;
  }
  for (const filePath of patch.deleteFilePaths ?? []) {
    merged.deleteFilePaths.add(filePath);
    delete merged.upsertFiles[filePath];
  }
  for (const [filePath, entry] of Object.entries(patch.upsertFiles ?? {})) {
    merged.deleteFilePaths.delete(filePath);
    merged.upsertFiles[filePath] = entry;
  }
  return merged;
}

export function createWorkspaceCachePersistenceScheduler(
  dependencies: WorkspaceCachePersistenceSchedulerDependencies,
): WorkspaceCachePersistenceScheduler {
  const stateByWorkspace = new Map<string, WorkspacePersistenceState>();

  const readState = (workspaceRoot: string): WorkspacePersistenceState => {
    const existing = stateByWorkspace.get(workspaceRoot);
    if (existing) {
      return existing;
    }
    const created = { active: false, scheduled: false, waiters: new Set<() => void>() };
    stateByWorkspace.set(workspaceRoot, created);
    return created;
  };

  const requestFlush = (workspaceRoot: string, state: WorkspacePersistenceState): void => {
    if (state.active || state.scheduled) {
      return;
    }
    state.scheduled = true;
    dependencies.scheduleIdle(() => {
      state.scheduled = false;
      void flush(workspaceRoot, state);
    });
  };

  const flush = async (
    workspaceRoot: string,
    state: WorkspacePersistenceState,
  ): Promise<void> => {
    if (state.active) {
      return;
    }
    state.active = true;
    const full = state.full;
    const patch = state.patch;
    state.full = undefined;
    state.patch = undefined;

    try {
      if (full) {
        let succeeded = false;
        try {
          if (full.onProgress) {
            await dependencies.saveFull(workspaceRoot, full.cache, {
              onProgress: full.onProgress,
            });
          } else {
            await dependencies.saveFull(workspaceRoot, full.cache);
          }
          succeeded = true;
        } catch (error) {
          (full.warn ?? dependencies.warn)(
            '[CodeGraphy] Failed to persist repo-local analysis cache.',
            error,
          );
        } finally {
          full.onSettled?.(succeeded);
        }
      }
      if (patch) {
        try {
          await dependencies.savePatch(workspaceRoot, {
            deleteFilePaths: [...patch.deleteFilePaths].sort(),
            upsertFiles: patch.upsertFiles,
          });
        } catch (error) {
          (patch.warn ?? dependencies.warn)(
            '[CodeGraphy] Failed to patch repo-local analysis cache.',
            error,
          );
        }
      }
    } finally {
      state.active = false;
      if (state.full || state.patch) {
        requestFlush(workspaceRoot, state);
      } else {
        stateByWorkspace.delete(workspaceRoot);
        for (const resolve of state.waiters) {
          resolve();
        }
      }
    }
  };

  return {
    scheduleFull(workspaceRoot, cache, onProgress, warn, onSettled): void {
      const state = readState(workspaceRoot);
      state.full = {
        cache: snapshotCache(cache),
        ...(onProgress ? { onProgress } : {}),
        ...(warn ? { warn } : {}),
        ...(onSettled ? { onSettled } : {}),
      };
      state.patch = undefined;
      requestFlush(workspaceRoot, state);
    },
    schedulePatch(workspaceRoot, patch, warn): void {
      const state = readState(workspaceRoot);
      state.patch = mergePatch(state.patch, patch, warn);
      requestFlush(workspaceRoot, state);
    },
    whenIdle(workspaceRoot): Promise<void> {
      const state = stateByWorkspace.get(workspaceRoot);
      if (!state) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        state.waiters.add(resolve);
      });
    },
  };
}
