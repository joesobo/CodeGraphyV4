import { describe, expect, it, vi } from 'vitest';
import { getCommitTreeFiles, getDiffNameStatus, getFileAtCommit } from '../../../src/extension/gitHistory/files';

describe('gitHistory/files', () => {
  it('reads and filters commit tree file output', async () => {
    const execGit = vi.fn(async () => 'src/a.ts\n\nsrc/b.ts\n');

    await expect(
      getCommitTreeFiles(execGit, 'abc123', new AbortController().signal)
    ).resolves.toEqual(['src/a.ts', 'src/b.ts']);
    expect(execGit).toHaveBeenCalledWith(
      ['ls-tree', '-r', '--name-only', 'abc123'],
      expect.any(AbortSignal)
    );
  });

  it('throws an abort error before reading tree files when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      getCommitTreeFiles(vi.fn(), 'abc123', controller.signal)
    ).rejects.toMatchObject({ name: 'AbortError', message: 'Indexing aborted' });
  });

  it('requests diff name-status output and file content at a commit', async () => {
    const execGit = vi.fn(async (args: string[]) => {
      if (args[0] === 'diff') {
        return 'M\tsrc/a.ts\n';
      }

      return 'export const a = 1;';
    });

    await expect(
      getDiffNameStatus(execGit, 'parent', 'child', new AbortController().signal)
    ).resolves.toBe('M\tsrc/a.ts\n');

    await expect(
      getFileAtCommit(execGit, 'child', 'src/a.ts', new AbortController().signal)
    ).resolves.toBe('export const a = 1;');

    expect(execGit.mock.calls).toEqual([
      [['diff', '--name-status', '-M', 'parent', 'child'], expect.any(AbortSignal)],
      [['show', 'child:src/a.ts'], expect.any(AbortSignal)],
    ]);
  });

  it('returns an empty string when reading a file at a commit fails', async () => {
    const execGit = vi.fn(async () => {
      throw new Error('missing');
    });

    await expect(
      getFileAtCommit(execGit, 'child', 'src/a.ts', new AbortController().signal)
    ).resolves.toBe('');
  });

  it('throws an abort error before reading diff output when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      getDiffNameStatus(vi.fn(), 'parent', 'child', controller.signal)
    ).rejects.toMatchObject({ name: 'AbortError', message: 'Indexing aborted' });
  });
});
