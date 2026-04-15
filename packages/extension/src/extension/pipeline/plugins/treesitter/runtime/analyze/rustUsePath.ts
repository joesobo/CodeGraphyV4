import * as path from 'node:path';
import { getRustCrateRoot } from '../projectRoots';
import { findExistingFile } from './existingFile';

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
