import * as path from 'node:path';
import { normalizePath } from '../parser';

function isWithinWorkspace(candidatePath: string, workspaceRoot: string): boolean {
  const relativePath = path.relative(workspaceRoot, candidatePath);
  return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

export function resolveGodotProjectRoot(
  filePath: string,
  workspaceRoot: string,
  projectRoots: ReadonlySet<string> = new Set(),
): string {
  const normalizedWorkspaceRoot = path.resolve(workspaceRoot);
  let currentPath = path.dirname(path.resolve(filePath));

  if (!isWithinWorkspace(currentPath, normalizedWorkspaceRoot)) {
    return workspaceRoot;
  }

  while (currentPath !== normalizedWorkspaceRoot) {
    const relativePath = normalizePath(path.relative(normalizedWorkspaceRoot, currentPath));

    if (projectRoots.has(relativePath)) {
      return currentPath;
    }

    currentPath = path.dirname(currentPath);
  }

  return workspaceRoot;
}
