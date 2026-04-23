import * as path from 'path';
import type { IPluginAnalysisContext } from '../../core/plugins/types/contracts';

interface GitHistoryPreAnalyzeRegistry {
  notifyPreAnalyze(
    files: Array<{
      absolutePath: string;
      relativePath: string;
      content: string;
    }>,
    workspaceRoot: string,
    context: IPluginAnalysisContext,
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
  context: IPluginAnalysisContext,
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
  await registry.notifyPreAnalyze(files, workspaceRoot, context);
}

function throwIfGitHistoryPreAnalyzeAborted(signal: AbortSignal): void {
  if (!signal.aborted) {
    return;
  }

  const error = new Error('Indexing aborted');
  error.name = 'AbortError';
  throw error;
}
