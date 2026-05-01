import * as path from 'node:path';
import { findExistingFile } from '../analyze/existingFile';

export function resolveHaskellSourceRoot(
  filePath: string,
  moduleName: string | null,
): string | null {
  if (!moduleName) {
    return path.dirname(filePath);
  }

  const moduleSegments = moduleName.split('.').filter(Boolean);
  const fileModuleSegment = path.basename(filePath, path.extname(filePath));
  if (moduleSegments.at(-1) === fileModuleSegment) {
    moduleSegments.pop();
  }

  let currentPath = path.dirname(filePath);
  for (const segment of moduleSegments.reverse()) {
    if (path.basename(currentPath) !== segment) {
      return null;
    }

    currentPath = path.dirname(currentPath);
  }

  return currentPath;
}

export function resolveHaskellModulePath(
  sourceRoot: string | null,
  moduleName: string,
): string | null {
  if (!sourceRoot) {
    return null;
  }

  const modulePath = path.join(sourceRoot, ...moduleName.split('.').filter(Boolean));
  return findExistingFile([
    `${modulePath}.hs`,
    `${modulePath}.lhs`,
  ]);
}
