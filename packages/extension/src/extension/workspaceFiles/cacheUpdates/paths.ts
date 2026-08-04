import path from 'node:path';
import { isDefaultExcludedPath } from '@codegraphy-dev/core';

export function collectWorkspaceCacheUpdatePaths(
  workspaceRoot: string,
  filePaths: readonly string[],
): string[] {
  const selectedPaths: string[] = [];
  const seenPaths = new Set<string>();

  for (const filePath of filePaths) {
    const absolutePath = path.resolve(filePath);
    const relativePath = path.relative(workspaceRoot, absolutePath);
    const normalizedPath = relativePath.split(path.sep).join('/');

    if (
      !normalizedPath
      || normalizedPath === '..'
      || normalizedPath.startsWith('../')
      || path.isAbsolute(relativePath)
      || isCodeGraphyGeneratedPath(normalizedPath)
      || (normalizedPath !== '.codegraphy/settings.json'
        && isDefaultExcludedPath(normalizedPath))
      || seenPaths.has(absolutePath)
    ) {
      continue;
    }

    seenPaths.add(absolutePath);
    selectedPaths.push(absolutePath);
  }

  return selectedPaths;
}

function isCodeGraphyGeneratedPath(relativePath: string): boolean {
  return relativePath.startsWith('.codegraphy/')
    && relativePath !== '.codegraphy/settings.json';
}
