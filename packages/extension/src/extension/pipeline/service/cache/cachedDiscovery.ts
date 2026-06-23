import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import type { IDiscoveredFile } from '@codegraphy-dev/core';

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

function toGitPath(relativePath: string): string {
  return relativePath.split(path.sep).join('/');
}

export function collectCachedGitIgnoredPaths(
  workspaceRoot: string,
  relativePaths: readonly string[],
  respectGitignore: boolean,
): string[] {
  if (!respectGitignore || relativePaths.length === 0) {
    return [];
  }

  const pathsByGitPath = new Map<string, string>();
  for (const relativePath of relativePaths) {
    pathsByGitPath.set(toGitPath(relativePath), relativePath);
  }

  const result = spawnSync('git', ['-C', workspaceRoot, 'check-ignore', '--stdin'], {
    encoding: 'utf8',
    input: `${[...pathsByGitPath.keys()].join('\n')}\n`,
  });

  if (result.error || (result.status !== 0 && result.status !== 1)) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map(gitPath => pathsByGitPath.get(gitPath) ?? gitPath);
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
