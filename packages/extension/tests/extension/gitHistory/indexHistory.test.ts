import { describe, expect, it, vi } from 'vitest';
import { indexGitHistory } from '../../../src/extension/gitHistory/indexHistory';
import type { ICommitInfo, IGraphData } from '../../../src/shared/types';

function createCommit(sha: string, parents: string[] = []): ICommitInfo {
  return { sha, timestamp: 1, message: sha, author: 'Dev', parents };
}

describe('gitHistory/indexHistory', () => {
  it('returns early when there are no commits', async () => {
    const dependencies = {
      analyzeDiffCommit: vi.fn(),
      analyzeFullCommit: vi.fn(),
      getCommitList: vi.fn(async () => []),
      persistCachedCommitState: vi.fn(),
      writeCachedGraphData: vi.fn(),
    };

    await expect(
      indexGitHistory({
        dependencies,
        onProgress: vi.fn(),
        signal: new AbortController().signal,
      })
    ).resolves.toEqual([]);

    expect(dependencies.analyzeFullCommit).not.toHaveBeenCalled();
    expect(dependencies.persistCachedCommitState).not.toHaveBeenCalled();
  });

  it('analyzes the first commit fully, later commits by diff, and persists cache state', async () => {
    const graphA: IGraphData = { nodes: [{ id: 'a', label: 'a', color: '#fff' }], edges: [] };
    const graphB: IGraphData = { nodes: [...graphA.nodes, { id: 'b', label: 'b', color: '#fff' }], edges: [] };
    const commits = [createCommit('sha1'), createCommit('sha2', ['sha1'])];
    const dependencies = {
      analyzeDiffCommit: vi.fn(async () => graphB),
      analyzeFullCommit: vi.fn(async () => graphA),
      getCommitList: vi.fn(async () => commits),
      persistCachedCommitState: vi.fn(),
      writeCachedGraphData: vi.fn(),
    };
    const onProgress = vi.fn();

    await expect(
      indexGitHistory({
        dependencies,
        maxCommits: 25,
        onProgress,
        signal: new AbortController().signal,
      })
    ).resolves.toEqual(commits);

    expect(dependencies.getCommitList).toHaveBeenCalledWith(25, expect.any(AbortSignal));
    expect(dependencies.analyzeFullCommit).toHaveBeenCalledWith('sha1', expect.any(AbortSignal));
    expect(dependencies.analyzeDiffCommit).toHaveBeenCalledWith(
      'sha2',
      'sha1',
      graphA,
      expect.any(AbortSignal)
    );
    expect(dependencies.writeCachedGraphData).toHaveBeenNthCalledWith(1, 'sha1', graphA);
    expect(dependencies.writeCachedGraphData).toHaveBeenNthCalledWith(2, 'sha2', graphB);
    expect(dependencies.persistCachedCommitState).toHaveBeenCalledWith(commits);
    expect(onProgress).toHaveBeenCalledWith('Indexing commits', 1, 2);
    expect(onProgress).toHaveBeenCalledWith('Indexing commits', 2, 2);
  });

  it('throws an abort error when the signal aborts mid-index', async () => {
    const controller = new AbortController();
    const dependencies = {
      analyzeDiffCommit: vi.fn(async () => ({ nodes: [], edges: [] })),
      analyzeFullCommit: vi.fn(async () => ({ nodes: [], edges: [] })),
      getCommitList: vi.fn(async () => [
        createCommit('sha1'),
        createCommit('sha2', ['sha1']),
        createCommit('sha3', ['sha2']),
      ]),
      persistCachedCommitState: vi.fn(),
      writeCachedGraphData: vi.fn(),
    };
    const onProgress = vi.fn((_phase: string, current: number) => {
      if (current === 2) {
        controller.abort();
      }
    });

    await expect(
      indexGitHistory({
        dependencies,
        onProgress,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: 'AbortError', message: 'Indexing aborted' });

    expect(dependencies.writeCachedGraphData).toHaveBeenCalledTimes(2);
    expect(dependencies.persistCachedCommitState).not.toHaveBeenCalled();
  });
});
