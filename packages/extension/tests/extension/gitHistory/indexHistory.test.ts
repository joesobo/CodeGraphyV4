import { describe, expect, it, vi } from 'vitest';
import { indexGitHistory } from '../../../src/extension/gitHistory/indexHistory';
import type { ICommitInfo, IGraphData } from '../../../src/shared/types';

function createCommit(sha: string, parents: string[] = []): ICommitInfo {
  return { sha, timestamp: 1, message: sha, author: 'Dev', parents };
}

function createGraph(id: string): IGraphData {
  return { nodes: [{ id, label: id, color: '#fff' }], edges: [] };
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

    expect(dependencies.getCommitList).toHaveBeenCalledWith(500, expect.any(AbortSignal));
    expect(dependencies.analyzeFullCommit).not.toHaveBeenCalled();
    expect(dependencies.persistCachedCommitState).not.toHaveBeenCalled();
  });

  it('analyzes the first commit fully, later commits by diff, and persists cache state', async () => {
    const graphA = createGraph('a');
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

  it('indexes a single commit without diff analysis', async () => {
    const graphA = createGraph('a');
    const commits = [createCommit('sha1')];
    const dependencies = {
      analyzeDiffCommit: vi.fn(),
      analyzeFullCommit: vi.fn(async () => graphA),
      getCommitList: vi.fn(async () => commits),
      persistCachedCommitState: vi.fn(),
      writeCachedGraphData: vi.fn(),
    };
    const onProgress = vi.fn();

    await expect(
      indexGitHistory({
        dependencies,
        onProgress,
        signal: new AbortController().signal,
      })
    ).resolves.toEqual(commits);

    expect(dependencies.analyzeFullCommit).toHaveBeenCalledWith('sha1', expect.any(AbortSignal));
    expect(dependencies.analyzeDiffCommit).not.toHaveBeenCalled();
    expect(dependencies.writeCachedGraphData).toHaveBeenCalledOnce();
    expect(dependencies.writeCachedGraphData).toHaveBeenCalledWith('sha1', graphA);
    expect(dependencies.persistCachedCommitState).toHaveBeenCalledWith(commits);
    expect(onProgress).toHaveBeenCalledOnce();
    expect(onProgress).toHaveBeenCalledWith('Indexing commits', 1, 1);
  });

  it('passes the previous diff result into the next diff analysis', async () => {
    const graphA = createGraph('a');
    const graphB = createGraph('b');
    const graphC = createGraph('c');
    const commits = [
      createCommit('sha1'),
      createCommit('sha2', ['sha1']),
      createCommit('sha3', ['sha2']),
    ];
    const dependencies = {
      analyzeDiffCommit: vi.fn()
        .mockResolvedValueOnce(graphB)
        .mockResolvedValueOnce(graphC),
      analyzeFullCommit: vi.fn(async () => graphA),
      getCommitList: vi.fn(async () => commits),
      persistCachedCommitState: vi.fn(),
      writeCachedGraphData: vi.fn(),
    };

    await indexGitHistory({
      dependencies,
      onProgress: vi.fn(),
      signal: new AbortController().signal,
    });

    expect(dependencies.analyzeDiffCommit).toHaveBeenNthCalledWith(
      1,
      'sha2',
      'sha1',
      graphA,
      expect.any(AbortSignal)
    );
    expect(dependencies.analyzeDiffCommit).toHaveBeenNthCalledWith(
      2,
      'sha3',
      'sha2',
      graphB,
      expect.any(AbortSignal)
    );
    expect(dependencies.writeCachedGraphData).toHaveBeenNthCalledWith(1, 'sha1', graphA);
    expect(dependencies.writeCachedGraphData).toHaveBeenNthCalledWith(2, 'sha2', graphB);
    expect(dependencies.writeCachedGraphData).toHaveBeenNthCalledWith(3, 'sha3', graphC);
  });

  it('throws before first-commit analysis when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const dependencies = {
      analyzeDiffCommit: vi.fn(),
      analyzeFullCommit: vi.fn(async () => createGraph('a')),
      getCommitList: vi.fn(async () => [createCommit('sha1')]),
      persistCachedCommitState: vi.fn(),
      writeCachedGraphData: vi.fn(),
    };
    const onProgress = vi.fn();

    await expect(
      indexGitHistory({
        dependencies,
        onProgress,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: 'AbortError', message: 'Indexing aborted' });

    expect(onProgress).not.toHaveBeenCalled();
    expect(dependencies.analyzeFullCommit).not.toHaveBeenCalled();
    expect(dependencies.analyzeDiffCommit).not.toHaveBeenCalled();
    expect(dependencies.writeCachedGraphData).not.toHaveBeenCalled();
    expect(dependencies.persistCachedCommitState).not.toHaveBeenCalled();
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
