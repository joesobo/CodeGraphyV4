import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveGoPackageDirectory } from './module';
import { findNearestProjectRoot } from '../rootSearch';

function resolveGoDirectFilePath(packageDirectoryPath: string): string | null {
  const directFilePath = `${packageDirectoryPath}.go`;
  return fs.existsSync(directFilePath) && fs.statSync(directFilePath).isFile()
    ? directFilePath
    : null;
}

function listGoPackageFiles(packageDirectoryPath: string): string[] {
  if (!fs.existsSync(packageDirectoryPath) || !fs.statSync(packageDirectoryPath).isDirectory()) {
    return [];
  }

  return fs.readdirSync(packageDirectoryPath)
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
