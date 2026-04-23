import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createGitHistoryAnalysisContext } from '../../../src/extension/gitHistory/analysisContext';

describe('createGitHistoryAnalysisContext', () => {
  it('resolves commit-local files and directories and caches file reads', async () => {
    const getFileAtCommit = vi.fn(async (sha: string, filePath: string) => {
      return `${sha}:${filePath}`;
    });
    const context = createGitHistoryAnalysisContext({
      allFiles: ['src/app.ts', 'src/lib/util.ts', 'README.md'],
      getFileAtCommit,
      sha: 'abc123',
      signal: new AbortController().signal,
      workspaceRoot: '/workspace',
    });

    expect(context.mode).toBe('timeline');
    expect(context.commitSha).toBe('abc123');

    const rootPath = '/workspace';
    const srcDirectory = path.join(rootPath, 'src');
    const libDirectory = path.join(rootPath, 'src', 'lib');
    const appFile = path.join(rootPath, 'src', 'app.ts');
    const utilFile = path.join(rootPath, 'src', 'lib', 'util.ts');
    const readmeFile = path.join(rootPath, 'README.md');
    const missingPath = path.join(rootPath, 'missing.ts');
    const outsidePath = '/outside/app.ts';

    await expect(context.fileSystem.exists(rootPath)).resolves.toBe(true);
    await expect(context.fileSystem.exists(srcDirectory)).resolves.toBe(true);
    await expect(context.fileSystem.exists(appFile)).resolves.toBe(true);
    await expect(context.fileSystem.exists(missingPath)).resolves.toBe(false);
    await expect(context.fileSystem.exists(outsidePath)).resolves.toBe(false);

    await expect(context.fileSystem.isDirectory(rootPath)).resolves.toBe(true);
    await expect(context.fileSystem.isDirectory(srcDirectory)).resolves.toBe(true);
    await expect(context.fileSystem.isDirectory(libDirectory)).resolves.toBe(true);
    await expect(context.fileSystem.isDirectory(appFile)).resolves.toBe(false);

    await expect(context.fileSystem.isFile(appFile)).resolves.toBe(true);
    await expect(context.fileSystem.isFile(utilFile)).resolves.toBe(true);
    await expect(context.fileSystem.isFile(srcDirectory)).resolves.toBe(false);
    await expect(context.fileSystem.isFile(outsidePath)).resolves.toBe(false);

    await expect(context.fileSystem.listDirectory(rootPath)).resolves.toEqual(['README.md', 'src']);
    await expect(context.fileSystem.listDirectory(srcDirectory)).resolves.toEqual(['app.ts', 'lib']);
    await expect(context.fileSystem.listDirectory(libDirectory)).resolves.toEqual(['util.ts']);
    await expect(context.fileSystem.listDirectory(outsidePath)).resolves.toBeNull();

    await expect(context.fileSystem.readTextFile(appFile)).resolves.toBe('abc123:src/app.ts');
    await expect(context.fileSystem.readTextFile(appFile)).resolves.toBe('abc123:src/app.ts');
    await expect(context.fileSystem.readTextFile(readmeFile)).resolves.toBe('abc123:README.md');
    await expect(context.fileSystem.readTextFile(srcDirectory)).resolves.toBeNull();
    await expect(context.fileSystem.readTextFile(missingPath)).resolves.toBeNull();
    await expect(context.fileSystem.readTextFile(outsidePath)).resolves.toBeNull();

    expect(getFileAtCommit).toHaveBeenCalledTimes(2);
    expect(getFileAtCommit).toHaveBeenNthCalledWith(
      1,
      'abc123',
      'src/app.ts',
      expect.any(AbortSignal),
    );
    expect(getFileAtCommit).toHaveBeenNthCalledWith(
      2,
      'abc123',
      'README.md',
      expect.any(AbortSignal),
    );
  });

  it('returns null when commit-local file reads fail', async () => {
    const getFileAtCommit = vi.fn(async () => {
      throw new Error('missing from commit');
    });
    const context = createGitHistoryAnalysisContext({
      allFiles: ['src/app.ts'],
      getFileAtCommit,
      sha: 'deadbeef',
      signal: new AbortController().signal,
      workspaceRoot: '/workspace',
    });
    const filePath = '/workspace/src/app.ts';

    await expect(context.fileSystem.readTextFile(filePath)).resolves.toBeNull();
    await expect(context.fileSystem.readTextFile(filePath)).resolves.toBeNull();

    expect(getFileAtCommit).toHaveBeenCalledTimes(1);
    expect(getFileAtCommit).toHaveBeenCalledWith(
      'deadbeef',
      'src/app.ts',
      expect.any(AbortSignal),
    );
  });
});
