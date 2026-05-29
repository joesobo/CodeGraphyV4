import path from 'node:path';
import type { IDiscoveredFile } from '../discovery/contracts';

export interface WorkspaceIndexFileChangeSelection {
  files: IDiscoveredFile[];
  unmatchedFilePaths: string[];
}

export function mapDiscoveredWorkspaceIndexFilesByRelativePath(
  files: readonly IDiscoveredFile[],
): Map<string, IDiscoveredFile> {
  return new Map(files.map((file) => [file.relativePath, file] as const));
}

function toWorkspaceRelativePath(workspaceRoot: string, filePath: string): string | undefined {
  const relativePath = path.relative(workspaceRoot, filePath);
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return undefined;
  }

  return relativePath;
}

function isDescendantPath(parentPath: string, childPath: string): boolean {
  const relativePath = path.relative(parentPath, childPath);
  return Boolean(relativePath) && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

export function selectDiscoveredWorkspaceIndexFileChanges(
  workspaceRoot: string,
  filePaths: readonly string[],
  discoveredByRelativePath: ReadonlyMap<string, IDiscoveredFile>,
): WorkspaceIndexFileChangeSelection {
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

export function mergeDiscoveredWorkspaceIndexFiles(
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

