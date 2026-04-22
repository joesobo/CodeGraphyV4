import * as path from 'node:path';

export function normalizeGitHistoryPath(relativePath: string): string {
  return relativePath.split(path.sep).join('/');
}

export function toRelativeGitHistoryFilePath(
  absolutePath: string,
  workspaceRoot: string,
): string | null {
  const relativePath = path.relative(workspaceRoot, absolutePath);
  if (relativePath === '') {
    return null;
  }

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return normalizeGitHistoryPath(relativePath);
}

export function toRelativeGitHistoryDirectoryPath(
  absolutePath: string,
  workspaceRoot: string,
): string | null {
  const relativePath = path.relative(workspaceRoot, absolutePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return relativePath === '' ? '' : normalizeGitHistoryPath(relativePath);
}

export function buildGitHistoryDirectoryEntries(
  allFiles: readonly string[],
): Map<string, string[]> {
  const directoryEntries = new Map<string, Set<string>>();

  const addEntry = (directoryPath: string, entryName: string) => {
    const entries = directoryEntries.get(directoryPath);
    if (entries) {
      entries.add(entryName);
      return;
    }

    directoryEntries.set(directoryPath, new Set([entryName]));
  };

  for (const relativeFilePath of allFiles) {
    const segments = normalizeGitHistoryPath(relativeFilePath).split('/');
    let currentDirectory = '';

    for (let index = 0; index < segments.length; index += 1) {
      addEntry(currentDirectory, segments[index]);

      if (index === segments.length - 1) {
        break;
      }

      currentDirectory = currentDirectory
        ? `${currentDirectory}/${segments[index]}`
        : segments[index];
    }
  }

  return new Map(
    Array.from(directoryEntries.entries(), ([directoryPath, entries]) => {
      return [directoryPath, Array.from(entries).sort()];
    }),
  );
}
