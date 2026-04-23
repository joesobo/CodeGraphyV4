import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createGitHistoryCommitPathHost } from '../../../src/extension/gitHistory/commitPathHost';

describe('gitHistory/commitPathHost', () => {
  it('answers file, directory, and read requests from the commit tree snapshot', async () => {
    const getFileAtCommit = vi.fn(async (_sha: string, filePath: string) => {
      return filePath === 'go.mod' ? 'module github.com/acme/project\n' : '';
    });
    const workspaceRoot = '/virtual/workspace';
    const host = await createGitHistoryCommitPathHost({
      allFiles: ['go.mod', 'src/app.ts', 'src/lib/util.ts'],
      getFileAtCommit,
      sha: 'abc123',
      signal: new AbortController().signal,
      workspaceRoot,
    });

    expect(host.isFile(path.join(workspaceRoot, 'src/app.ts'))).toBe(true);
    expect(host.isDirectory(path.join(workspaceRoot, 'src'))).toBe(true);
    expect(host.exists(path.join(workspaceRoot, 'src/lib'))).toBe(true);
    expect(host.listDirectory(path.join(workspaceRoot, 'src'))).toEqual(['app.ts', 'lib']);
    expect(host.readTextFile(path.join(workspaceRoot, 'go.mod'))).toBe('module github.com/acme/project\n');
    expect(host.readTextFile(path.join(workspaceRoot, 'src/app.ts'))).toBeNull();
    expect(getFileAtCommit).toHaveBeenCalledTimes(1);
  });
});
