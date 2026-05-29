import { removeInvalidatedWorkspaceIndexDirectories } from '@codegraphy-dev/core';

export function removeInvalidatedDiscoveredDirectories(
  directories: readonly string[],
  filePaths: readonly string[],
  workspaceRoot: string,
  toWorkspaceRelativePath: (workspaceRoot: string, filePath: string) => string | undefined,
): string[] {
  return removeInvalidatedWorkspaceIndexDirectories(
    directories,
    filePaths,
    workspaceRoot,
    toWorkspaceRelativePath,
  );
}
