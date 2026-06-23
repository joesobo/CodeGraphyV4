import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

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
