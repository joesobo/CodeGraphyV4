import { DEFAULT_EXCLUDE, matchesAnyPattern } from '../discovery/pathMatching';

function normalizePendingPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/\/+$/, '');
}

export function filterWorkspaceStatusPendingChangedFiles(
  filePaths: readonly string[],
  options: { workspaceRoot?: string } = {},
): string[] {
  const normalizedWorkspaceRoot = options.workspaceRoot
    ? normalizePendingPath(options.workspaceRoot)
    : undefined;

  return filePaths.filter((filePath) => {
    if (
      normalizedWorkspaceRoot
      && normalizePendingPath(filePath) === normalizedWorkspaceRoot
    ) {
      return false;
    }

    return !matchesAnyPattern(filePath, DEFAULT_EXCLUDE);
  });
}
