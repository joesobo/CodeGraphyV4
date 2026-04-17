import type { IDiscoveredFile } from '../../../../core/discovery/contracts';

export function mapDiscoveredWorkspaceFilesByRelativePath(
  files: readonly IDiscoveredFile[],
): Map<string, IDiscoveredFile> {
  return new Map(files.map((file) => [file.relativePath, file] as const));
}

export function selectDiscoveredWorkspaceFiles(
  workspaceRoot: string,
  filePaths: readonly string[],
  discoveredByRelativePath: ReadonlyMap<string, IDiscoveredFile>,
  toWorkspaceRelativePath: (workspaceRoot: string, filePath: string) => string | undefined,
): IDiscoveredFile[] {
  const relativePaths = [...new Set(
    filePaths
      .map((filePath) => toWorkspaceRelativePath(workspaceRoot, filePath))
      .filter((filePath): filePath is string => Boolean(filePath)),
  )];

  return relativePaths
    .map((filePath) => discoveredByRelativePath.get(filePath))
    .filter((file): file is IDiscoveredFile => Boolean(file));
}

export function mergeDiscoveredWorkspaceFiles(
  changedFiles: readonly IDiscoveredFile[],
  additionalFilePaths: readonly string[],
  discoveredByRelativePath: ReadonlyMap<string, IDiscoveredFile>,
): IDiscoveredFile[] {
  const additionalFiles = additionalFilePaths
    .map((filePath) => discoveredByRelativePath.get(filePath))
    .filter((file): file is IDiscoveredFile => Boolean(file));

  return [...new Map(
    [...changedFiles, ...additionalFiles].map((file) => [file.relativePath, file] as const),
  ).values()];
}
