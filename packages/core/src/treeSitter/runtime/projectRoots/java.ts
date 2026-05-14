import * as path from 'node:path';
import { treeSitterPathIsFile } from '../pathHost';

export function resolveJavaSourceRoot(
  filePath: string,
  packageName: string | null,
): string | null {
  if (!packageName) {
    let currentPath = path.dirname(filePath);
    while (true) {
      if (path.basename(currentPath) === 'src') {
        return currentPath;
      }

      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) {
        return null;
      }

      currentPath = parentPath;
    }
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

export function resolveJavaTypePath(
  sourceRoot: string | null,
  typeName: string,
): string | null {
  if (!sourceRoot) {
    return null;
  }

  const candidatePath = path.join(sourceRoot, ...typeName.split('.')) + '.java';
  return treeSitterPathIsFile(candidatePath)
    ? candidatePath
    : null;
}
