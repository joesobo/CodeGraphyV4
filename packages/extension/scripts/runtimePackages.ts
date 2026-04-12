import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const EXTENSION_RUNTIME_PACKAGE_NAMES = [
  '@ladybugdb/core',
  'node-gyp-build',
  'tree-sitter',
  'tree-sitter-javascript',
  'tree-sitter-typescript',
] as const;

function resolvePackageEntryPath(packageName: string): string {
  return require.resolve(packageName);
}

export function resolveRuntimePackageRootPath(
  packageName: string,
  resolveEntryPath: (packageName: string) => string = resolvePackageEntryPath,
): string {
  let currentPath = path.dirname(resolveEntryPath(packageName));

  while (!fs.existsSync(path.join(currentPath, 'package.json'))) {
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      throw new Error(`Unable to find package root for ${packageName}`);
    }
    currentPath = parentPath;
  }

  return currentPath;
}

export function getVendoredPackageRootPath(
  outputFilePath: string,
  packageName: string,
): string {
  return path.join(path.dirname(outputFilePath), 'node_modules', ...packageName.split('/'));
}

export function copyRuntimePackage(
  outputFilePath: string,
  packageName: string,
  resolvePackageRootPath: (packageName: string) => string = resolveRuntimePackageRootPath,
): string {
  const sourcePath = resolvePackageRootPath(packageName);
  const targetPath = getVendoredPackageRootPath(outputFilePath, packageName);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.cpSync(sourcePath, targetPath, {
    recursive: true,
    force: true,
    dereference: true,
  });

  return targetPath;
}

export function syncExtensionRuntimePackages(
  outputFilePath: string,
  packageNames: readonly string[] = EXTENSION_RUNTIME_PACKAGE_NAMES,
): string[] {
  return packageNames.map(packageName => copyRuntimePackage(outputFilePath, packageName));
}
