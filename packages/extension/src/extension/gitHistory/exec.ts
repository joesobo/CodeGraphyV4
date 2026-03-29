import { execFile } from 'child_process';
import { createIndexingAbortError } from './shared/abort';

export type ExecGitCommand = (args: string[], signal?: AbortSignal) => Promise<string>;

type ExecFileLike = typeof execFile;

interface ExecGitOptions {
  workspaceRoot: string;
  signal?: AbortSignal;
  execFileImpl?: ExecFileLike;
  maxBuffer?: number;
}

export function execGitCommand(
  args: string[],
  {
    workspaceRoot,
    signal,
    execFileImpl = execFile,
    maxBuffer = 10 * 1024 * 1024,
  }: ExecGitOptions
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (signal?.aborted) {
      reject(createIndexingAbortError());
      return;
    }

    let settled = false;
    const onAbort = () => {
      if (settled) {
        return;
      }
      child.kill();
      finish(createIndexingAbortError());
    };

    const finish = (error: unknown, stdout: string = '') => {
      if (settled) {
        return;
      }
      settled = true;
      signal?.removeEventListener('abort', onAbort);

      if (error) {
        reject(error instanceof Error ? error : new Error('Git command failed'));
        return;
      }

      resolve(stdout);
    };

    const child = execFileImpl(
      'git',
      args,
      { cwd: workspaceRoot, maxBuffer },
      (error: Error | null, stdout: string) => {
        finish(error, stdout);
      }
    );

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
