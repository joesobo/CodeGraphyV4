import { existsSync } from 'fs';
import { join } from 'path';

const TEST_ROOTS = ['tests', '__tests__'] as const;

export function isTestPath(packageRelativePath: string | undefined): boolean {
  return TEST_ROOTS.some((root) => (
    packageRelativePath === root ||
    packageRelativePath?.startsWith(`${root}/`) === true
  ));
}

export function existingTestRoots(packageRoot: string, packageName: string): string[] {
  return TEST_ROOTS
    .map((segment) => join(packageRoot, segment))
    .filter((value) => existsSync(value))
    .map((value) => value.replace(`${packageRoot}/`, `packages/${packageName}/`));
}
