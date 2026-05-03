import * as path from 'node:path';
import { findExistingFile } from '../analyze/existingFile';

export function resolvePhpSourceRoot(
  filePath: string,
  namespaceName: string | null,
): string | null {
  if (!namespaceName) {
    return path.dirname(filePath);
  }

  let currentPath = path.dirname(filePath);
  for (const segment of namespaceName.split('\\').filter(Boolean).reverse()) {
    if (path.basename(currentPath) !== segment) {
      return null;
    }

    currentPath = path.dirname(currentPath);
  }

  return currentPath;
}

export function resolvePhpTypePath(
  sourceRoot: string | null,
  typeName: string,
): string | null {
  if (!sourceRoot) {
    return null;
  }

  return findExistingFile([
    `${path.join(sourceRoot, ...typeName.split('\\').filter(Boolean))}.php`,
  ]);
}
