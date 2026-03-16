import { createAbortError } from './abort';
import type { ExecGitCommand } from './gitExec';

export async function getCommitTreeFiles(
  execGit: ExecGitCommand,
  sha: string,
  signal: AbortSignal
): Promise<string[]> {
  if (signal.aborted) {
    throw createAbortError();
  }

  const output = await execGit(['ls-tree', '-r', '--name-only', sha], signal);
  return output.trim().split('\n').filter(Boolean);
}

export async function getDiffNameStatus(
  execGit: ExecGitCommand,
  parentSha: string,
  sha: string,
  signal: AbortSignal
): Promise<string> {
  if (signal.aborted) {
    throw createAbortError();
  }

  return execGit(['diff', '--name-status', '-M', parentSha, sha], signal);
}

export async function getFileAtCommit(
  execGit: ExecGitCommand,
  sha: string,
  filePath: string,
  signal: AbortSignal
): Promise<string> {
  try {
    return await execGit(['show', `${sha}:${filePath}`], signal);
  } catch {
    return '';
  }
}
