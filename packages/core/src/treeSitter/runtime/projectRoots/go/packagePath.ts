import * as path from 'node:path';
import { resolveGoPackageDirectory } from './module';
import {
  treeSitterPathIsDirectory,
  treeSitterPathIsFile,
  treeSitterReadDirectory,
} from '../../pathHost';
import { findNearestProjectRoot } from '../search';

function resolveGoDirectFilePath(packageDirectoryPath: string): string | null {
  const directFilePath = `${packageDirectoryPath}.go`;
  return treeSitterPathIsFile(directFilePath)
    ? directFilePath
    : null;
}

function listGoPackageFiles(packageDirectoryPath: string): string[] {
  if (!treeSitterPathIsDirectory(packageDirectoryPath)) {
    return [];
  }

  return treeSitterReadDirectory(packageDirectoryPath)
    .filter((entry) => entry.endsWith('.go') && !entry.endsWith('_test.go'))
    .sort();
}

export function resolveGoPackagePath(
  filePath: string,
  workspaceRoot: string,
  importPath: string,
): string | null {
  const projectRoot = findNearestProjectRoot(filePath, ['go.mod'], workspaceRoot) ?? workspaceRoot;
  const packageDirectoryPath = resolveGoPackageDirectory(projectRoot, importPath);
  if (!packageDirectoryPath) {
    return null;
  }

  const directFilePath = resolveGoDirectFilePath(packageDirectoryPath);
  if (directFilePath) {
    return directFilePath;
  }

  const packageFiles = listGoPackageFiles(packageDirectoryPath);
  if (packageFiles.length === 0) {
    return null;
  }

  return path.join(packageDirectoryPath, packageFiles[0]);
}
