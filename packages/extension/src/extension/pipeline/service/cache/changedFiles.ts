import path from 'node:path';
import type { IDiscoveredFile } from '../../../../core/discovery/contracts';

export interface WorkspaceFileChangeSelection {
  files: IDiscoveredFile[];
  unmatchedFilePaths: string[];
}

export function mapDiscoveredWorkspaceFilesByRelativePath(
  files: readonly IDiscoveredFile[],
): Map<string, IDiscoveredFile> {
  return new Map(files.map((file) => [file.relativePath, file] as const));
}

function isDescendantPath(parentPath: string, childPath: string): boolean {
  const relativePath = path.relative(parentPath, childPath);
  return Boolean(relativePath) && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

export function selectDiscoveredWorkspaceFileChanges(
  workspaceRoot: string,
  filePaths: readonly string[],
  discoveredByRelativePath: ReadonlyMap<string, IDiscoveredFile>,
  toWorkspaceRelativePath: (workspaceRoot: string, filePath: string) => string | undefined,
): WorkspaceFileChangeSelection {
  const selected = new Map<string, IDiscoveredFile>();
  const unmatchedFilePaths: string[] = [];

  for (const filePath of filePaths) {
    const relativePath = toWorkspaceRelativePath(workspaceRoot, filePath);
    if (!relativePath) {
      continue;
    }

    const exactFile = discoveredByRelativePath.get(relativePath);
    if (exactFile) {
      selected.set(exactFile.relativePath, exactFile);
      continue;
    }

    const descendantFiles = [...discoveredByRelativePath.values()]
      .filter((file) => isDescendantPath(relativePath, file.relativePath));

    if (descendantFiles.length === 0) {
      unmatchedFilePaths.push(filePath);
      continue;
    }

    for (const file of descendantFiles) {
      selected.set(file.relativePath, file);
    }
  }

  return {
    files: [...selected.values()],
    unmatchedFilePaths,
  };
}

export function selectDiscoveredWorkspaceFiles(
  workspaceRoot: string,
  filePaths: readonly string[],
  discoveredByRelativePath: ReadonlyMap<string, IDiscoveredFile>,
  toWorkspaceRelativePath: (workspaceRoot: string, filePath: string) => string | undefined,
): IDiscoveredFile[] {
  return selectDiscoveredWorkspaceFileChanges(
    workspaceRoot,
    filePaths,
    discoveredByRelativePath,
    toWorkspaceRelativePath,
  ).files;
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
