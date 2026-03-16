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
  const firstCommit = commits[0];

  if (signal.aborted) {
    throw createAbortError();
  }

  onProgress('Indexing commits', 1, total);
  let previousGraphData: IGraphData = await dependencies.analyzeFullCommit(firstCommit.sha, signal);
  await dependencies.writeCachedGraphData(firstCommit.sha, previousGraphData);

  for (let index = 1; index < commits.length; index++) {
    if (signal.aborted) {
      throw createAbortError();
    }

    const commit = commits[index];
    onProgress('Indexing commits', index + 1, total);
    previousGraphData = await dependencies.analyzeDiffCommit(
      commit.sha,
      commits[index - 1].sha,
      previousGraphData,
      signal
    );
    await dependencies.writeCachedGraphData(commit.sha, previousGraphData);
  }

  await dependencies.persistCachedCommitState(commits);
  return commits;
}
