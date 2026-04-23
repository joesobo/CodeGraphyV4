import * as path from 'node:path';
import { normalizePath } from './parser';

function isWithinRoot(candidatePath: string, rootPath: string): boolean {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export function collectGodotProjectRoots(relativePaths: readonly string[]): Set<string> {
  return new Set(relativePaths.flatMap((relativePath) => {
    if (path.basename(relativePath) !== 'project.godot') {
      return [];
    }

    const projectRoot = normalizePath(path.dirname(relativePath));
    return [projectRoot === '.' ? '' : projectRoot];
  }));
}

export function resolveGodotProjectRoot(
  filePath: string,
  workspaceRoot: string,
  projectRoots: ReadonlySet<string> = new Set(),
): string {
  let currentPath = path.dirname(filePath);
  const normalizedWorkspaceRoot = path.resolve(workspaceRoot);

  while (true) {
    const relativePath = normalizeProjectRoot(path.relative(normalizedWorkspaceRoot, currentPath));

    if (projectRoots.has(relativePath)) {
      return currentPath;
    }

    if (currentPath === normalizedWorkspaceRoot) {
      return workspaceRoot;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath || !isWithinRoot(parentPath, normalizedWorkspaceRoot)) {
      return workspaceRoot;
    }

    currentPath = parentPath;
  }
}

function normalizeProjectRoot(relativePath: string): string {
  const normalizedPath = normalizePath(relativePath);
  return normalizedPath === '.' ? '' : normalizedPath;
}
