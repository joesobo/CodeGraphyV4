import * as path from 'node:path';
import { findExistingFile } from '../analyze/existingFile';

export function resolveLuaModulePath(
  workspaceRoot: string,
  specifier: string,
): string | null {
  const modulePath = path.join(workspaceRoot, ...specifier.split('.').filter(Boolean));
  return findExistingFile([
    `${modulePath}.lua`,
    path.join(modulePath, 'init.lua'),
  ]);
}
