import { execFile } from 'node:child_process';
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  readlink,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { isAbsolute, join, normalize, sep } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const gitOutputLimitBytes = 16 * 1024 * 1024;
const selfBatchFileCount = 100;

export const SELF_BATCH_DIRECTORY = 'perf/self-batch-100';

export interface SelfWorkspaceCopyResult {
  analyzableFileCount: number;
  copiedPaths: string[];
}

function isAnalyzableTypeScriptPath(path: string): boolean {
  return path.endsWith('.ts') || path.endsWith('.tsx');
}

function requireSafeRelativePath(path: string): void {
  const normalized = normalize(path);
  if (
    !path
    || isAbsolute(path)
    || normalized === '..'
    || normalized.startsWith(`..${sep}`)
  ) {
    throw new Error(`Unsafe self performance fixture path: ${path}`);
  }
}

function isMissingFile(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT';
}

async function copyWorkspacePath(
  sourceRoot: string,
  destinationRoot: string,
  relativePath: string,
): Promise<boolean> {
  requireSafeRelativePath(relativePath);
  const sourcePath = join(sourceRoot, relativePath);
  const destinationPath = join(destinationRoot, relativePath);
  let status;
  try {
    status = await lstat(sourcePath);
  } catch (error) {
    if (isMissingFile(error)) return false;
    throw error;
  }

  await mkdir(join(destinationPath, '..'), { recursive: true });
  if (status.isSymbolicLink()) {
    await symlink(await readlink(sourcePath), destinationPath);
    return true;
  }
  if (!status.isFile()) {
    throw new Error(`Unsupported self performance fixture entry: ${relativePath}`);
  }

  await copyFile(sourcePath, destinationPath);
  await chmod(destinationPath, status.mode);
  return true;
}

async function currentWorkspacePaths(repoRoot: string): Promise<string[]> {
  const { stdout } = await execFileAsync('git', [
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '-z',
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: gitOutputLimitBytes,
  });
  return stdout
    .split('\0')
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Copies the current Git worktree, including non-ignored untracked files.
 * Git's exclude-standard inventory intentionally omits dependency trees,
 * build output, caches, and repository metadata from the isolated fixture.
 */
export async function copySelfWorkspace(
  repoRoot: string,
  destinationRoot: string,
): Promise<SelfWorkspaceCopyResult> {
  await mkdir(destinationRoot, { recursive: true });
  const copiedPaths: string[] = [];
  for (const path of await currentWorkspacePaths(repoRoot)) {
    if (await copyWorkspacePath(repoRoot, destinationRoot, path)) {
      copiedPaths.push(path);
    }
  }

  return {
    analyzableFileCount: copiedPaths.filter(isAnalyzableTypeScriptPath).length,
    copiedPaths,
  };
}

function batchFileName(index: number): string {
  return `file-${index.toString().padStart(3, '0')}.ts`;
}

function renderBatchFile(index: number): string {
  const nextIndex = index === selfBatchFileCount - 1 ? 0 : index + 1;
  return [
    `import './${batchFileName(nextIndex).replace(/\.ts$/, '')}';`,
    '',
    `export const self_perf_batch_${index.toString().padStart(3, '0')} = ${index};`,
    '',
  ].join('\n');
}

export async function writeSelfBatchFiles(workspaceRoot: string): Promise<string[]> {
  await mkdir(join(workspaceRoot, SELF_BATCH_DIRECTORY), { recursive: true });
  const relativePaths = Array.from(
    { length: selfBatchFileCount },
    (_, index) => join(SELF_BATCH_DIRECTORY, batchFileName(index)),
  );
  await Promise.all(relativePaths.map((relativePath, index) => writeFile(
    join(workspaceRoot, relativePath),
    renderBatchFile(index),
    'utf8',
  )));
  return relativePaths;
}
