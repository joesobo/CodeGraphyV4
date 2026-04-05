import { beforeEach, describe, expect, it, vi } from 'vitest';

const diffChangeMocks = vi.hoisted(() => ({
  addGitHistoryGraphFile: vi.fn(async () => {}),
  modifyGitHistoryGraphFile: vi.fn(async () => {}),
}));

const diffStateMocks = vi.hoisted(() => ({
  deleteGitHistoryGraphFile: vi.fn(),
  renameGitHistoryGraphFile: vi.fn(),
}));

const reanalyzeMocks = vi.hoisted(() => ({
  reanalyzeGraphFile: vi.fn(async () => {}),
}));

vi.mock('../../../../src/extension/gitHistory/diff/changes', () => diffChangeMocks);
vi.mock('../../../../src/extension/gitHistory/diff/state', () => diffStateMocks);
vi.mock('../../../../src/extension/gitHistory/reanalyzeGraphFile', () => reanalyzeMocks);

import { analyzeDiffCommitGraph } from '../../../../src/extension/gitHistory/diff/analysis';

describe('gitHistory/diff/analysis', () => {
  beforeEach(() => {
    diffChangeMocks.addGitHistoryGraphFile.mockClear();
    diffChangeMocks.modifyGitHistoryGraphFile.mockClear();
    diffStateMocks.deleteGitHistoryGraphFile.mockClear();
    diffStateMocks.renameGitHistoryGraphFile.mockClear();
    reanalyzeMocks.reanalyzeGraphFile.mockClear();
  });

  it('dispatches diff lines to the correct helper and skips excluded added files', async () => {
    const result = await analyzeDiffCommitGraph({
      diffOutput: [
        'R100\tsrc/old.ts\tsrc/new.ts',
        'A\tignored.ts',
        'A\tsrc/add.ts',
        'M\tsrc/edit.ts',
        'D\tsrc/remove.ts',
        'X\tsrc/unknown.ts',
      ].join('\n'),
      getFileAtCommit: vi.fn(async () => ''),
      previousGraph: {
        nodes: [
          { id: 'src/keep.ts', label: 'keep.ts', color: '#fff' },
          { id: 'src/drop.ts', label: 'drop.ts', color: '#fff' },
        ],
        edges: [
          { id: 'keep', from: 'src/keep.ts', to: 'src/keep.ts' , kind: 'import', sources: [] },
          { id: 'drop', from: 'src/drop.ts', to: 'src/missing.ts' , kind: 'import', sources: [] },
        ],
      },
      registry: {
        analyzeFile: vi.fn(async () => []),
        supportsFile: vi.fn(() => true),
      },
      sha: 'sha2',
      shouldExclude: (filePath) => filePath === 'ignored.ts',
      signal: new AbortController().signal,
      workspaceRoot: '/workspace',
    });

    expect(diffStateMocks.renameGitHistoryGraphFile).toHaveBeenCalledWith(
      'src/old.ts',
      'src/new.ts',
      expect.any(Array),
      expect.any(Map),
      expect.any(Set)
    );
    expect(reanalyzeMocks.reanalyzeGraphFile).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: 'src/new.ts',
        sha: 'sha2',
        workspaceRoot: '/workspace',
      })
    );
    expect(diffChangeMocks.addGitHistoryGraphFile).toHaveBeenCalledTimes(1);
    expect(diffChangeMocks.addGitHistoryGraphFile).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: 'src/add.ts' })
    );
    expect(diffChangeMocks.modifyGitHistoryGraphFile).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: 'src/edit.ts' })
    );
    expect(diffStateMocks.deleteGitHistoryGraphFile).toHaveBeenCalledWith(
      'src/remove.ts',
      expect.any(Array),
      expect.any(Array),
      expect.any(Map),
      expect.any(Set)
    );
    expect(result.edges).toEqual([{ id: 'keep', from: 'src/keep.ts', to: 'src/keep.ts' , kind: 'import', sources: [] }]);
  });

  it('throws an abort error when the signal is already aborted before the first diff line', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      analyzeDiffCommitGraph({
        diffOutput: 'A\tsrc/add.ts',
        getFileAtCommit: vi.fn(async () => ''),
        previousGraph: { nodes: [], edges: [] },
        registry: {
          analyzeFile: vi.fn(async () => []),
          supportsFile: vi.fn(() => true),
        },
        sha: 'sha2',
        shouldExclude: () => false,
        signal: controller.signal,
        workspaceRoot: '/workspace',
      })
    ).rejects.toMatchObject({ name: 'AbortError', message: 'Indexing aborted' });
  });
});
