import * as path from 'node:path';
import { findExistingFile } from '../analyze/existingFile';

export function resolveKotlinSourceRoot(
  filePath: string,
  packageName: string | null,
): string | null {
  if (!packageName) {
    return path.dirname(filePath);
  }

  let currentPath = path.dirname(filePath);
  for (const segment of packageName.split('.').filter(Boolean).reverse()) {
    if (path.basename(currentPath) !== segment) {
      return null;
    }

    currentPath = path.dirname(currentPath);
  }

  return currentPath;
}

export function resolveKotlinTypePath(
  sourceRoot: string | null,
  typeName: string,
): string | null {
  if (!sourceRoot) {
    return null;
  }

  const typePath = path.join(sourceRoot, ...typeName.split('.'));
  return findExistingFile([
    `${typePath}.kt`,
    `${typePath}.kts`,
  ]);
}
