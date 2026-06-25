import {
  readCodeGraphyRepoMeta,
  writeCodeGraphyRepoMeta,
} from '../../../repoSettings/meta';
import { shouldIgnoreWorkspaceFileWatcherRefresh } from '../../../workspaceFiles/ignore';

export interface PendingWorkspaceRefreshState {
  filePaths: Set<string>;
  gitignoreRefresh: boolean;
  logMessage: string;
}

function normalizeFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/\/+$/, '');
}

function filterPendingWorkspaceRefreshPaths(
  workspaceRoot: string,
  filePaths: readonly string[],
): string[] {
  const normalizedWorkspaceRoot = normalizeFilePath(workspaceRoot);
  return filePaths.filter((filePath) => {
    if (normalizeFilePath(filePath) === normalizedWorkspaceRoot) {
      return false;
    }

    return !shouldIgnoreWorkspaceFileWatcherRefresh(filePath);
  });
}

function persistPendingWorkspaceRefreshPaths(
  workspaceRoot: string,
  filePaths: readonly string[],
): void {
  const meta = readCodeGraphyRepoMeta(workspaceRoot);
  writeCodeGraphyRepoMeta(workspaceRoot, {
    ...meta,
    pendingChangedFiles: [...filePaths],
  });
}

export function persistPendingWorkspaceRefresh(
  workspaceRoot: string | undefined,
  filePaths: readonly string[],
): void {
  if (!workspaceRoot) {
    return;
  }

  persistPendingWorkspaceRefreshPaths(
    workspaceRoot,
    filterPendingWorkspaceRefreshPaths(workspaceRoot, filePaths),
  );
}

export function loadPersistedWorkspaceRefresh(
  workspaceRoot: string | undefined,
): PendingWorkspaceRefreshState | undefined {
  if (!workspaceRoot) {
    return undefined;
  }

  const meta = readCodeGraphyRepoMeta(workspaceRoot);
  const pendingChangedFiles = filterPendingWorkspaceRefreshPaths(
    workspaceRoot,
    meta.pendingChangedFiles,
  );
  if (pendingChangedFiles.length !== meta.pendingChangedFiles.length) {
    persistPendingWorkspaceRefreshPaths(workspaceRoot, pendingChangedFiles);
  }

  if (pendingChangedFiles.length === 0) {
    return undefined;
  }

  return {
    filePaths: new Set(pendingChangedFiles),
    gitignoreRefresh: pendingChangedFiles.some(filePath =>
      filePath.replace(/\\/g, '/').endsWith('/.gitignore')
      || filePath.replace(/\\/g, '/') === '.gitignore'
    ),
    logMessage: '[CodeGraphy] Applying pending workspace changes',
  };
}
