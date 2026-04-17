import * as fs from 'node:fs';
import * as path from 'node:path';
import { shouldStopProjectRootWalk } from './workspaceBounds';

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

    const parentPath = path.dirname(currentPath);
    if (shouldStopProjectRootWalk(parentPath, normalizedWorkspaceRoot)) {
      return null;
    }

    currentPath = parentPath;
  }
}

export function dedupePaths(paths: Array<string | null | undefined>): string[] {
  return [...new Set(paths.filter((candidate): candidate is string => Boolean(candidate)))];
}
