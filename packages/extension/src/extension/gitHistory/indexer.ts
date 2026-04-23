import type { IGraphData } from '../../shared/graph/contracts';
import type { ICommitInfo } from '../../shared/timeline/contracts';
import { createAbortError } from './shared/abort';

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

function getCachedTimelineCommits(
  commits: ICommitInfo[],
  firstGraphableCommitIndex: number,
): ICommitInfo[] {
  return firstGraphableCommitIndex >= 0 ? commits.slice(firstGraphableCommitIndex) : [];
}

async function indexFirstCommit(
  firstCommit: ICommitInfo,
  total: number,
  dependencies: IndexGitHistoryDependencies,
  onProgress: IndexGitHistoryOptions['onProgress'],
  signal: AbortSignal,
): Promise<{ firstGraphableCommitIndex: number; previousGraphData: IGraphData }> {
  const previousGraphData = await dependencies.analyzeFullCommit(firstCommit.sha, signal);
  await dependencies.writeCachedGraphData(firstCommit.sha, previousGraphData);
  onProgress('Indexing commits', 1, total);

  return {
    firstGraphableCommitIndex: previousGraphData.nodes.length > 0 ? 0 : -1,
    previousGraphData,
  };
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

  const firstCommitIndexing = await indexFirstCommit(
    firstCommit,
    total,
    dependencies,
    onProgress,
    signal,
  );
  let previousGraphData = firstCommitIndexing.previousGraphData;
  let firstGraphableCommitIndex = firstCommitIndexing.firstGraphableCommitIndex;

  for (let index = 1; index < commits.length; index++) {
    if (signal.aborted) {
      throw createAbortError();
    }

    const commit = commits[index];
    previousGraphData = await dependencies.analyzeDiffCommit(
      commit.sha,
      commits[index - 1].sha,
      previousGraphData,
      signal
    );
    await dependencies.writeCachedGraphData(commit.sha, previousGraphData);
    onProgress('Indexing commits', index + 1, total);

    if (firstGraphableCommitIndex < 0 && previousGraphData.nodes.length > 0) {
      firstGraphableCommitIndex = index;
    }
  }

  const cachedCommits = getCachedTimelineCommits(commits, firstGraphableCommitIndex);

  onProgress('Finalizing timeline cache', total, total);
  await dependencies.persistCachedCommitState(cachedCommits);
  return cachedCommits;
}
