import * as fs from 'node:fs';
import * as path from 'node:path';

const goModuleNameCache = new Map<string, string | null>();

export function readGoModuleName(projectRoot: string): string | null {
  if (goModuleNameCache.has(projectRoot)) {
    return goModuleNameCache.get(projectRoot) ?? null;
  }

  const goModPath = path.join(projectRoot, 'go.mod');
  let moduleName: string | null = null;

  if (fs.existsSync(goModPath)) {
    const content = fs.readFileSync(goModPath, 'utf8');
    const match = content.match(/^module\s+(.+)$/mu);
    moduleName = match?.[1]?.trim() ?? null;
  }

  goModuleNameCache.set(projectRoot, moduleName);
  return moduleName;
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
