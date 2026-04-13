import * as fs from 'node:fs';
import * as path from 'node:path';

const pythonProjectMarkers = [
  'pyproject.toml',
  'setup.py',
  'setup.cfg',
  'Pipfile',
] as const;

const goModuleNameCache = new Map<string, string | null>();

function isWithinRoot(candidatePath: string, rootPath: string): boolean {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export function findNearestProjectRoot(
  filePath: string,
  markers: readonly string[],
  workspaceRoot: string,
): string | null {
  let currentPath = path.dirname(filePath);
  const normalizedWorkspaceRoot = path.resolve(workspaceRoot);

  while (true) {
    for (const marker of markers) {
      if (fs.existsSync(path.join(currentPath, marker))) {
        return currentPath;
      }
    }

    if (currentPath === normalizedWorkspaceRoot) {
      return null;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath || !isWithinRoot(parentPath, normalizedWorkspaceRoot)) {
      return null;
    }

    currentPath = parentPath;
  }
}

function dedupePaths(paths: Array<string | null | undefined>): string[] {
  return [...new Set(paths.filter((candidate): candidate is string => Boolean(candidate)))];
}

export function getPythonSearchRoots(filePath: string, workspaceRoot: string): string[] {
  const pythonProjectRoot = findNearestProjectRoot(filePath, pythonProjectMarkers, workspaceRoot);
  return dedupePaths([pythonProjectRoot, workspaceRoot]);
}

export function getRustCrateRoot(filePath: string, workspaceRoot: string): string {
  return findNearestProjectRoot(filePath, ['Cargo.toml'], workspaceRoot) ?? workspaceRoot;
}

function readGoModuleName(projectRoot: string): string | null {
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

function resolveGoPackageDirectory(projectRoot: string, importPath: string): string | null {
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

  const directFilePath = `${packageDirectoryPath}.go`;
  if (fs.existsSync(directFilePath) && fs.statSync(directFilePath).isFile()) {
    return directFilePath;
  }

  if (!fs.existsSync(packageDirectoryPath) || !fs.statSync(packageDirectoryPath).isDirectory()) {
    return null;
  }

  const packageFiles = fs.readdirSync(packageDirectoryPath)
    .filter((entry) => entry.endsWith('.go') && !entry.endsWith('_test.go'))
    .sort();

  if (packageFiles.length === 0) {
    return null;
  }

  return path.join(packageDirectoryPath, packageFiles[0]);
}

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
  return fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()
    ? candidatePath
    : null;
}
