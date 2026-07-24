import { spawnSync } from 'node:child_process';

function toGitPath(relativePath: string): string {
  return relativePath.split(/[\\/]/).join('/');
}

function createCachedGitPathLookup(relativePaths: readonly string[]): Map<string, string> {
  return new Map(relativePaths.map(relativePath => [toGitPath(relativePath), relativePath]));
}

function createGitCheckIgnoreInput(pathsByGitPath: ReadonlyMap<string, string>): string {
  return `${[...pathsByGitPath.keys()].join('\n')}\n`;
}

function didGitCheckIgnoreFail(result: ReturnType<typeof spawnSync>): boolean {
  if (result.error) {
    return true;
  }

  switch (result.status) {
    case 0:
    case 1:
      return false;
    default:
      return true;
  }
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
  const gitPaths = [...pathsByGitPath.keys()];
  const ignoredPaths: string[] = [];
  const batchSize = 500;

  for (let offset = 0; offset < gitPaths.length; offset += batchSize) {
    const batchPaths = gitPaths.slice(offset, offset + batchSize);
    const batchLookup = new Map(
      batchPaths.map(gitPath => [gitPath, pathsByGitPath.get(gitPath) ?? gitPath]),
    );
    const result = spawnSync('git', ['-C', workspaceRoot, 'check-ignore', '--stdin'], {
      encoding: 'utf8',
      input: createGitCheckIgnoreInput(batchLookup),
    });

    if (didGitCheckIgnoreFail(result)) {
      return [];
    }

    ignoredPaths.push(...readGitIgnoredCachedPaths(result.stdout, batchLookup));
  }

  return ignoredPaths;
}
