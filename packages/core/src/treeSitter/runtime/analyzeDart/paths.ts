import * as path from 'node:path';
import { findExistingFile } from '../analyze/existingFile';
import { findNearestProjectRoot } from '../projectRoots/search';

function resolveDartPackageImport(workspaceRoot: string, specifier: string): string | null {
  const packagePath = specifier.slice('package:'.length);
  const firstPathSeparatorIndex = packagePath.indexOf('/');
  if (firstPathSeparatorIndex <= 0 || firstPathSeparatorIndex === packagePath.length - 1) {
    return null;
  }

  const packageRelativePath = packagePath.slice(firstPathSeparatorIndex + 1);
  const absolutePath = path.join(workspaceRoot, 'lib', packageRelativePath);
  return findExistingFile([absolutePath, `${absolutePath}.dart`]);
}

function resolveDartRelativeImport(filePath: string, specifier: string): string | null {
  const absolutePath = path.resolve(path.dirname(filePath), specifier);
  return findExistingFile([absolutePath, `${absolutePath}.dart`]);
}

export function resolveDartImportPath(
  filePath: string,
  workspaceRoot: string,
  specifier: string,
): string | null {
  if (specifier.startsWith('package:')) {
    const projectRoot = findNearestProjectRoot(filePath, ['pubspec.yaml'], workspaceRoot)
      ?? workspaceRoot;
    return resolveDartPackageImport(projectRoot, specifier);
  }

  if (specifier.includes(':')) {
    return null;
  }

  return resolveDartRelativeImport(filePath, specifier);
}
