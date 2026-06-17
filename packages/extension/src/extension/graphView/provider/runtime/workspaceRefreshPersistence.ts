import {
  readCodeGraphyRepoMeta,
  writeCodeGraphyRepoMeta,
} from '../../../repoSettings/meta';

export interface PendingWorkspaceRefreshState {
  filePaths: Set<string>;
  gitignoreRefresh: boolean;
  logMessage: string;
}

export function persistPendingWorkspaceRefresh(
  workspaceRoot: string | undefined,
  filePaths: readonly string[],
): void {
  if (!workspaceRoot) {
    return;
  }

  const meta = readCodeGraphyRepoMeta(workspaceRoot);
  writeCodeGraphyRepoMeta(workspaceRoot, {
    ...meta,
    pendingChangedFiles: [...filePaths],
  });
}

export function loadPersistedWorkspaceRefresh(
  workspaceRoot: string | undefined,
): PendingWorkspaceRefreshState | undefined {
  if (!workspaceRoot) {
    return undefined;
  }

  const meta = readCodeGraphyRepoMeta(workspaceRoot);
  if (meta.pendingChangedFiles.length === 0) {
    return undefined;
  }

  return {
    filePaths: new Set(meta.pendingChangedFiles),
    gitignoreRefresh: meta.pendingChangedFiles.some(filePath =>
      filePath.replace(/\\/g, '/').endsWith('/.gitignore')
      || filePath.replace(/\\/g, '/') === '.gitignore'
    ),
    logMessage: '[CodeGraphy] Applying pending workspace changes',
  };
}
