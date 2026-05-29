function normalizeWorkspaceRelativePath(filePath: string): string {
  return filePath.split('\\').join('/').split('/').filter(Boolean).join('/');
}

function isDirectoryAtOrBelowPath(directoryPath: string, targetPath: string): boolean {
  return directoryPath === targetPath || directoryPath.startsWith(`${targetPath}/`);
}

export function removeInvalidatedDiscoveredDirectories(
  directories: readonly string[],
  filePaths: readonly string[],
  workspaceRoot: string,
  toWorkspaceRelativePath: (workspaceRoot: string, filePath: string) => string | undefined,
): string[] {
  const invalidatedPaths = filePaths
    .map(filePath => toWorkspaceRelativePath(workspaceRoot, filePath))
    .filter((filePath): filePath is string => Boolean(filePath))
    .map(normalizeWorkspaceRelativePath);

  return directories.filter((directoryPath) => {
    const normalizedDirectory = normalizeWorkspaceRelativePath(directoryPath);
    return !invalidatedPaths.some(invalidatedPath =>
      isDirectoryAtOrBelowPath(normalizedDirectory, invalidatedPath),
    );
  });
}
