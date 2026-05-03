import * as path from 'node:path';
import {
  treeSitterPathIsDirectory,
  treeSitterReadDirectory,
} from '../pathHost';
import { findNearestProjectRoot } from '../projectRoots/search';

function resolveSwiftPackageSourceFile(projectRoot: string, moduleName: string): string | null {
  const moduleDirectory = path.join(projectRoot, 'Sources', moduleName);
  if (!treeSitterPathIsDirectory(moduleDirectory)) {
    return null;
  }

  const swiftFile = treeSitterReadDirectory(moduleDirectory)
    .filter((entry) => entry.endsWith('.swift'))
    .sort()[0];

  return swiftFile ? path.join(moduleDirectory, swiftFile) : null;
}

export function resolveSwiftModuleImportPath(
  filePath: string,
  workspaceRoot: string,
  moduleName: string,
): string | null {
  const packageRoot = findNearestProjectRoot(filePath, ['Package.swift'], workspaceRoot);
  return packageRoot
    ? resolveSwiftPackageSourceFile(packageRoot, moduleName)
    : null;
}
