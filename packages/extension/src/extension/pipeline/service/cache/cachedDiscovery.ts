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

function createCachedGitPathLookup(relativePaths: readonly string[]): Map<string, string> {
  return new Map(relativePaths.map(relativePath => [toGitPath(relativePath), relativePath]));
}

function createGitCheckIgnoreInput(pathsByGitPath: ReadonlyMap<string, string>): string {
  return `${[...pathsByGitPath.keys()].join('\n')}\n`;
}

function didGitCheckIgnoreFail(result: ReturnType<typeof spawnSync>): boolean {
  return Boolean(result.error) || (result.status !== 0 && result.status !== 1);
}

function readGitIgnoredCachedPaths(
  stdout: string,
  pathsByGitPath: ReadonlyMap<string, string>,
): string[] {
  return stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map(gitPath => pathsByGitPath.get(gitPath) ?? gitPath);
}

export function collectCachedGitIgnoredPaths(
  workspaceRoot: string,
  relativePaths: readonly string[],
  respectGitignore: boolean,
): string[] {
  if (!respectGitignore || relativePaths.length === 0) {
    return [];
  }

  const pathsByGitPath = createCachedGitPathLookup(relativePaths);

  const result = spawnSync('git', ['-C', workspaceRoot, 'check-ignore', '--stdin'], {
    encoding: 'utf8',
    input: createGitCheckIgnoreInput(pathsByGitPath),
  });

  if (didGitCheckIgnoreFail(result)) {
    return [];
  }

  return readGitIgnoredCachedPaths(result.stdout, pathsByGitPath);
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
