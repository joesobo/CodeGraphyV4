import path from 'node:path';
import type { IDiscoveredFile } from '../discovery/contracts';

export interface WorkspaceIndexFileChangeSelection {
  files: IDiscoveredFile[];
  unmatchedFilePaths: string[];
}

export function mapDiscoveredWorkspaceIndexFilesByRelativePath(
  files: readonly IDiscoveredFile[],
): Map<string, IDiscoveredFile> {
  return new Map(files.map((file) => [normalizeWorkspaceRelativePath(file.relativePath), file] as const));
}

function toWorkspaceRelativePath(workspaceRoot: string, filePath: string): string | undefined {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(workspaceRoot, filePath);
  const relativePath = path.relative(workspaceRoot, absolutePath);
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return undefined;
  }

  return normalizeWorkspaceRelativePath(relativePath);
}

function normalizeWorkspaceRelativePath(filePath: string): string {
  return filePath.split('\\').join('/');
}

function isDescendantPath(parentPath: string, childPath: string): boolean {
  const relativePath = path.posix.relative(
    normalizeWorkspaceRelativePath(parentPath),
    normalizeWorkspaceRelativePath(childPath),
  );
  const isNestedRelativePath = Boolean(relativePath)
    && !relativePath.startsWith('..')
    && !path.posix.isAbsolute(relativePath);
  return isNestedRelativePath;
}

function getDescendantDiscoveredFiles(
  relativePath: string,
  discoveredByRelativePath: ReadonlyMap<string, IDiscoveredFile>,
): IDiscoveredFile[] {
  return [...discoveredByRelativePath.values()]
    .filter((file) => isDescendantPath(relativePath, file.relativePath));
}

function selectDiscoveredWorkspaceIndexFileChange(
  selected: Map<string, IDiscoveredFile>,
  unmatchedFilePaths: string[],
  filePath: string,
  workspaceRoot: string,
  discoveredByRelativePath: ReadonlyMap<string, IDiscoveredFile>,
): void {
  const relativePath = toWorkspaceRelativePath(workspaceRoot, filePath);
  if (!relativePath) {
    return;
  }

  const exactFile = discoveredByRelativePath.get(relativePath);
  if (exactFile) {
    selected.set(normalizeWorkspaceRelativePath(exactFile.relativePath), exactFile);
    return;
  }

  const descendantFiles = getDescendantDiscoveredFiles(relativePath, discoveredByRelativePath);
  if (descendantFiles.length === 0) {
    unmatchedFilePaths.push(filePath);
    return;
  }

  for (const file of descendantFiles) {
    selected.set(normalizeWorkspaceRelativePath(file.relativePath), file);
  }
}

export function selectDiscoveredWorkspaceIndexFileChanges(
  workspaceRoot: string,
  filePaths: readonly string[],
  discoveredByRelativePath: ReadonlyMap<string, IDiscoveredFile>,
): WorkspaceIndexFileChangeSelection {
  const selected = new Map<string, IDiscoveredFile>();
  const unmatchedFilePaths: string[] = [];

  for (const filePath of filePaths) {
    selectDiscoveredWorkspaceIndexFileChange(
      selected,
      unmatchedFilePaths,
      filePath,
      workspaceRoot,
      discoveredByRelativePath,
    );
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
    .map((filePath) => discoveredByRelativePath.get(normalizeWorkspaceRelativePath(filePath)))
    .filter((file): file is IDiscoveredFile => Boolean(file));

  return [...new Map(
    [...changedFiles, ...additionalFiles].map((file) => [normalizeWorkspaceRelativePath(file.relativePath), file] as const),
  ).values()];
}
