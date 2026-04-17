import * as path from 'node:path';
import { findExistingFile } from '../analyze/existingFile';

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
