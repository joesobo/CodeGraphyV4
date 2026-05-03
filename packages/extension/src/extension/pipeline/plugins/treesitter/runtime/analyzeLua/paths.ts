import * as path from 'node:path';
import { findExistingFile } from '../analyze/existingFile';
import { findNearestProjectRoot } from '../projectRoots/search';

const LUA_PROJECT_MARKERS = ['.luarc.json'] as const;

export function resolveLuaModulePath(
  filePath: string,
  workspaceRoot: string,
  specifier: string,
): string | null {
  const projectRoot = findNearestProjectRoot(filePath, LUA_PROJECT_MARKERS, workspaceRoot)
    ?? workspaceRoot;
  const modulePath = path.join(projectRoot, ...specifier.split('.').filter(Boolean));
  return findExistingFile([
    `${modulePath}.lua`,
    path.join(modulePath, 'init.lua'),
  ]);
}
