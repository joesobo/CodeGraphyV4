import * as fs from 'node:fs';
import * as path from 'node:path';

function isWithinRoot(candidatePath: string, rootPath: string): boolean {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export function findNearestProjectRoot(
  filePath: string,
  markers: readonly string[],
  workspaceRoot: string,
): string | null {
  let currentPath = path.dirname(filePath);
  const normalizedWorkspaceRoot = path.resolve(workspaceRoot);

  while (true) {
    for (const marker of markers) {
      if (fs.existsSync(path.join(currentPath, marker))) {
        return currentPath;
      }
    }

    if (currentPath === normalizedWorkspaceRoot) {
      return null;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath || !isWithinRoot(parentPath, normalizedWorkspaceRoot)) {
      return null;
    }

    currentPath = parentPath;
  }
}

export function dedupePaths(paths: Array<string | null | undefined>): string[] {
  return [...new Set(paths.filter((candidate): candidate is string => Boolean(candidate)))];
}
