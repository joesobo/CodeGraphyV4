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

function createCachedGitPathBatches(gitPaths: readonly string[]): string[][] {
  const batches: string[][] = [];
  let batch: string[] = [];
  let batchBytes = 0;
  const maxBatchBytes = 256 * 1024;

  for (const gitPath of gitPaths) {
    const pathBytes = Buffer.byteLength(gitPath, 'utf8') + 1;
    if (batch.length > 0 && batchBytes + pathBytes > maxBatchBytes) {
      batches.push(batch);
      batch = [];
      batchBytes = 0;
    }
    batch.push(gitPath);
    batchBytes += pathBytes;
  }
  if (batch.length > 0) batches.push(batch);
  return batches;
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
  const ignoredPaths: string[] = [];

  for (const batchPaths of createCachedGitPathBatches([...pathsByGitPath.keys()])) {
    const batchLookup = new Map(
      batchPaths.map(gitPath => [gitPath, pathsByGitPath.get(gitPath) ?? gitPath]),
    );
    const result = spawnSync('git', ['-C', workspaceRoot, 'check-ignore', '--stdin'], {
      encoding: 'utf8',
      input: createGitCheckIgnoreInput(batchLookup),
      maxBuffer: 4 * 1024 * 1024,
    });

    if (result.error && (result.error as NodeJS.ErrnoException).code === 'ENOBUFS') {
      throw result.error;
    }
    if (didGitCheckIgnoreFail(result)) {
      return [];
    }

    ignoredPaths.push(...readGitIgnoredCachedPaths(result.stdout, batchLookup));
  }

  return ignoredPaths;
}
