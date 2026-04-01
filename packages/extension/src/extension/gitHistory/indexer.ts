import type { IGraphData } from '../../shared/graph/types';
import type { ICommitInfo } from '../../shared/timeline/types';
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

export async function indexGitHistory(
  options: IndexGitHistoryOptions
): Promise<ICommitInfo[]> {
  const { dependencies, maxCommits = 500, onProgress, signal } = options;
  const commits = await dependencies.getCommitList(maxCommits, signal);
  if (commits.length === 0) {
    return [];
  }

  const total = commits.length;
  const graphDataBySha = new Map<string, IGraphData>();

  for (let index = 0; index < commits.length; index++) {
    if (signal.aborted) {
      throw createAbortError();
    }

    const commit = commits[index];
    onProgress('Indexing commits', index + 1, total);
    const firstParentSha = commit.parents[0];
    const parentGraphData = firstParentSha ? graphDataBySha.get(firstParentSha) : undefined;
    const graphData = !firstParentSha || !parentGraphData
      ? await dependencies.analyzeFullCommit(commit.sha, signal)
      : await dependencies.analyzeDiffCommit(
          commit.sha,
          firstParentSha,
          parentGraphData,
          signal
        );

    graphDataBySha.set(commit.sha, graphData);
    await dependencies.writeCachedGraphData(commit.sha, graphData);
  }

  await dependencies.persistCachedCommitState(commits);
  return commits;
}
