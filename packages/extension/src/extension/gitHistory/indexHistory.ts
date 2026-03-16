import type { ICommitInfo, IGraphData } from '../../shared/types';
import { createAbortError } from './abort';

export interface IndexGitHistoryDependencies {
  analyzeDiffCommit(
    sha: string,
    parentSha: string,
    previousGraph: IGraphData,
    signal: AbortSignal
  ): Promise<IGraphData>;
  analyzeFullCommit(sha: string, signal: AbortSignal): Promise<IGraphData>;
  getCommitList(maxCommits: number, signal: AbortSignal): Promise<ICommitInfo[]>;
  persistCachedCommitState(commits: ICommitInfo[]): Promise<void>;
  writeCachedGraphData(sha: string, graphData: IGraphData): Promise<void>;
}

interface IndexGitHistoryOptions {
  dependencies: IndexGitHistoryDependencies;
  maxCommits?: number;
  onProgress: (phase: string, current: number, total: number) => void;
  signal: AbortSignal;
}

export async function indexGitHistory(
  options: IndexGitHistoryOptions
): Promise<ICommitInfo[]> {
  const { dependencies, maxCommits = 500, onProgress, signal } = options;
  const commits = await dependencies.getCommitList(maxCommits, signal);
  if (commits.length === 0) {
    return [];
  }

  const total = commits.length;
  let previousGraphData: IGraphData = { nodes: [], edges: [] };

  for (let index = 0; index < commits.length; index++) {
    if (signal.aborted) {
      throw createAbortError();
    }

    const commit = commits[index];
    onProgress('Indexing commits', index + 1, total);

    if (index === 0) {
      previousGraphData = await dependencies.analyzeFullCommit(commit.sha, signal);
    } else {
      previousGraphData = await dependencies.analyzeDiffCommit(
        commit.sha,
        commits[index - 1].sha,
        previousGraphData,
        signal
      );
    }

    await dependencies.writeCachedGraphData(commit.sha, previousGraphData);
  }

  await dependencies.persistCachedCommitState(commits);
  return commits;
}
