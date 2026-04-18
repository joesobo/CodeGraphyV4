import * as fs from 'node:fs';
import * as path from 'node:path';

function isWithinRoot(candidatePath: string, rootPath: string): boolean {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export function resolveGodotProjectRoot(filePath: string, workspaceRoot: string): string {
  let currentPath = path.dirname(filePath);
  const normalizedWorkspaceRoot = path.resolve(workspaceRoot);

  while (true) {
    if (fs.existsSync(path.join(currentPath, 'project.godot'))) {
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
