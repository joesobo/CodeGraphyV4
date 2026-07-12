import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import {
  readCachedChurn,
  writeCachedChurn,
  type ChurnCounts,
  type ChurnWorkspaceState,
} from './cache';
import { churnGitFormat, parseChurnLog } from './git';

const execFileAsync = promisify(execFile);
const MAX_COMMITS = 500;

export type ChurnGitRunner = (
  args: readonly string[],
  signal?: AbortSignal,
) => Promise<string>;

export interface RefreshChurnIndexOptions {
  filePaths: readonly string[];
  runGit?: ChurnGitRunner;
  signal?: AbortSignal;
  workspaceRoot: string;
  workspaceState: ChurnWorkspaceState;
}

function hashFileSet(filePaths: readonly string[]): string {
  return createHash('sha256')
    .update([...filePaths].sort().join('\n'))
    .digest('hex');
}

function createGitRunner(workspaceRoot: string): ChurnGitRunner {
  return async (args, signal) => {
    const { stdout } = await execFileAsync('git', [...args], {
      cwd: workspaceRoot,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      signal,
    });
    return stdout;
  };
}

async function buildChurnIndex(
  options: RefreshChurnIndexOptions,
  runGit: ChurnGitRunner,
): Promise<ChurnCounts> {
  const head = (await runGit(['rev-parse', 'HEAD'], options.signal)).trim();
  const fileSet = hashFileSet(options.filePaths);
  const cached = readCachedChurn(options.workspaceState, head, fileSet);
  if (cached) return cached;

  const workspacePrefix = (await runGit(['rev-parse', '--show-prefix'], options.signal)).trim();
  const log = await runGit([
    'log',
    '--name-status',
    `--format=${churnGitFormat}`,
    '-n',
    String(MAX_COMMITS),
    '--',
    '.',
  ], options.signal);
  const counts = parseChurnLog(log, options.filePaths, workspacePrefix);
  await writeCachedChurn(options.workspaceState, head, fileSet, counts);
  return counts;
}

export async function refreshChurnIndex(
  options: RefreshChurnIndexOptions,
): Promise<ChurnCounts> {
  try {
    return await buildChurnIndex(
      options,
      options.runGit ?? createGitRunner(options.workspaceRoot),
    );
  } catch (error) {
    if (options.signal?.aborted) throw error;
    return {};
  }
}
