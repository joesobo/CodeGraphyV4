import {
  readCodeGraphyRepoMeta,
  writeCodeGraphyRepoMeta,
} from '../../repoSettings/meta';

export function markWorkspaceCacheUpdateStale(
  workspaceRoot: string,
  filePaths: readonly string[],
): void {
  const meta = readCodeGraphyRepoMeta(workspaceRoot);
  writeCodeGraphyRepoMeta(workspaceRoot, {
    ...meta,
    pendingChangedFiles: [...new Set([...meta.pendingChangedFiles, ...filePaths])],
  });
}
