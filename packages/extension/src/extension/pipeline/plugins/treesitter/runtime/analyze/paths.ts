import * as path from 'node:path';
import { getPythonSearchRoots, getRustCrateRoot } from '../projectRoots';
import { findExistingFile } from './nodes';

export function resolvePythonModulePath(
  filePath: string,
  workspaceRoot: string,
  specifier: string,
): string | null {
  const leadingDots = specifier.match(/^\.+/)?.[0].length ?? 0;
  const modulePath = specifier.slice(leadingDots).replace(/\./g, '/');

  const buildCandidates = (baseDirectoryPath: string): string[] => {
    if (!modulePath) {
      return [
        path.join(baseDirectoryPath, '__init__.py'),
      ];
    }

    return [
      path.join(baseDirectoryPath, `${modulePath}.py`),
      path.join(baseDirectoryPath, modulePath, '__init__.py'),
    ];
  };

  if (leadingDots > 0) {
    let baseDirectoryPath = path.dirname(filePath);
    for (let index = 1; index < leadingDots; index += 1) {
      baseDirectoryPath = path.dirname(baseDirectoryPath);
    }

    return findExistingFile(buildCandidates(baseDirectoryPath));
  }

  const searchRoots = getPythonSearchRoots(filePath, workspaceRoot);
  return findExistingFile(
    searchRoots.flatMap((searchRoot) => [
      ...buildCandidates(searchRoot),
      ...buildCandidates(path.join(searchRoot, 'src')),
    ]),
  );
}

export function resolveRustModuleDeclarationPath(filePath: string, moduleName: string): string | null {
  const fileName = path.basename(filePath);
  const currentDirectoryPath = path.dirname(filePath);
  const nestedDirectoryPath = fileName === 'lib.rs' || fileName === 'main.rs' || fileName === 'mod.rs'
    ? currentDirectoryPath
    : path.join(currentDirectoryPath, fileName.replace(/\.rs$/u, ''));

  return findExistingFile([
    path.join(nestedDirectoryPath, `${moduleName}.rs`),
    path.join(nestedDirectoryPath, moduleName, 'mod.rs'),
    path.join(currentDirectoryPath, `${moduleName}.rs`),
    path.join(currentDirectoryPath, moduleName, 'mod.rs'),
  ]);
}

export function resolveRustUsePath(
  filePath: string,
  workspaceRoot: string,
  specifier: string,
): string | null {
  const segments = specifier.split('::').filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  let baseDirectoryPath = path.dirname(filePath);
  let moduleSegments = segments;
  const crateRoot = getRustCrateRoot(filePath, workspaceRoot);

  if (segments[0] === 'crate') {
    baseDirectoryPath = path.join(crateRoot, 'src');
    moduleSegments = segments.slice(1);
  } else if (segments[0] === 'super') {
    baseDirectoryPath = path.dirname(path.dirname(filePath));
    moduleSegments = segments.slice(1);
  } else if (segments[0] === 'self') {
    moduleSegments = segments.slice(1);
  }

  for (let length = moduleSegments.length; length >= 1; length -= 1) {
    const relativePath = moduleSegments.slice(0, length).join('/');
    const resolvedPath = findExistingFile([
      path.join(baseDirectoryPath, `${relativePath}.rs`),
      path.join(baseDirectoryPath, relativePath, 'mod.rs'),
    ]);
    if (resolvedPath) {
      return resolvedPath;
    }
  }

  return null;
}
