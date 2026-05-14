import * as path from 'node:path';
import { treeSitterReadTextFile } from '../../pathHost';

export function readGoModuleName(projectRoot: string): string | null {
  const goModPath = path.join(projectRoot, 'go.mod');
  const content = treeSitterReadTextFile(goModPath);
  if (!content) {
    return null;
  }

  const match = content.match(/^module\s+(.+)$/mu);
  return match?.[1]?.trim() ?? null;
}

export function resolveGoPackageDirectory(
  projectRoot: string,
  importPath: string,
): string | null {
  const moduleName = readGoModuleName(projectRoot);
  if (!moduleName) {
    return null;
  }

  if (importPath === moduleName) {
    return projectRoot;
  }

  if (!importPath.startsWith(`${moduleName}/`)) {
    return null;
  }

  return path.join(projectRoot, importPath.slice(moduleName.length + 1));
}
