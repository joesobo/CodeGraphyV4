import * as path from 'node:path';
import type { IDiscoveredFile } from '@codegraphy-dev/core';
import { collectCachedGitIgnoredPaths } from './cachedDiscovery/gitignore';

export { collectCachedGitIgnoredPaths } from './cachedDiscovery/gitignore';

export interface CachedWorkspaceDiscoveryState {
  directories: string[];
  files: IDiscoveredFile[];
  gitIgnoredPaths: string[];
}

export function createCachedDiscoveredFiles(
  workspaceRoot: string,
  filePaths: readonly string[],
): IDiscoveredFile[] {
  return filePaths.map(relativePath => ({
    absolutePath: path.join(workspaceRoot, relativePath),
    extension: path.extname(relativePath),
    name: path.basename(relativePath),
    relativePath,
  }));
}

export function collectCachedDirectoryPaths(filePaths: readonly string[]): string[] {
  const directories = new Set<string>();

  for (const filePath of filePaths) {
    let directory = path.posix.dirname(filePath.replace(/\\/g, '/'));
    while (directory && directory !== '.') {
      directories.add(directory);
      directory = path.posix.dirname(directory);
    }
  }

  return [...directories].sort();
}

export function createCachedWorkspaceDiscoveryState(
  workspaceRoot: string,
  filePaths: readonly string[],
  respectGitignore: boolean,
): CachedWorkspaceDiscoveryState {
  const directories = collectCachedDirectoryPaths(filePaths);
  return {
    directories,
    files: createCachedDiscoveredFiles(workspaceRoot, filePaths),
    gitIgnoredPaths: collectCachedGitIgnoredPaths(
      workspaceRoot,
      [...directories, ...filePaths],
      respectGitignore,
    ),
  };
}
