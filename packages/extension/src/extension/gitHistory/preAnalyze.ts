import * as path from 'path';

interface GitHistoryPreAnalyzeRegistry {
  notifyPreAnalyze(
    files: Array<{
      absolutePath: string;
      relativePath: string;
      content: string;
    }>,
    workspaceRoot: string,
  ): Promise<void>;
}

export interface PreAnalyzeGitHistoryOptions {
  allFiles: readonly string[];
  getFileAtCommit: (
    sha: string,
    filePath: string,
    signal: AbortSignal,
  ) => Promise<string>;
  registry: GitHistoryPreAnalyzeRegistry;
  sha: string;
  signal: AbortSignal;
  workspaceRoot: string;
}

export async function preAnalyzeGitHistoryPlugins(
  options: PreAnalyzeGitHistoryOptions,
): Promise<void> {
  const {
    allFiles,
    getFileAtCommit,
    registry,
    sha,
    signal,
    workspaceRoot,
  } = options;

  const files = await Promise.all(allFiles.map(async (relativePath) => {
    throwIfGitHistoryPreAnalyzeAborted(signal);

    return {
      absolutePath: path.join(workspaceRoot, relativePath),
      relativePath,
      content: await getFileAtCommit(sha, relativePath, signal),
    };
  }));

  throwIfGitHistoryPreAnalyzeAborted(signal);
  await registry.notifyPreAnalyze(files, workspaceRoot);
}

function throwIfGitHistoryPreAnalyzeAborted(signal: AbortSignal): void {
  if (!signal.aborted) {
    return;
  }

  const error = new Error('Indexing aborted');
  error.name = 'AbortError';
  throw error;
}
