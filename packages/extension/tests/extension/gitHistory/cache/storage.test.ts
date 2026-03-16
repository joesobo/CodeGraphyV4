import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../src/shared/types';

vi.mock('vscode', () => ({
  Uri: {
    joinPath: vi.fn((...args: unknown[]) => {
      const parts = args.map((value) => String((value as { fsPath?: string }).fsPath ?? value));
      return { fsPath: parts.join('/') };
    }),
  },
}));

import {
  readCachedGraphData,
  removeGitCacheDir,
  writeCachedGraphData,
} from '../../../src/extension/gitHistory/cache/storage';

function createFsPromises() {
  return {
    access: vi.fn(),
    mkdir: vi.fn(),
    readFile: vi.fn(),
    rm: vi.fn(),
    writeFile: vi.fn(),
  };
}

describe('gitHistory/cacheStorage', () => {
  it('returns cached graph data on a cache hit', async () => {
    const fsPromises = createFsPromises();
    const graphData: IGraphData = {
      nodes: [{ id: 'src/a.ts', label: 'a.ts', color: '#fff' }],
      edges: [],
    };

    fsPromises.access.mockResolvedValue(undefined);
    fsPromises.readFile.mockResolvedValue(JSON.stringify(graphData));

    await expect(
      readCachedGraphData({ fsPath: '/tmp/storage' } as never, 'abc123', fsPromises as never)
    ).resolves.toEqual(graphData);
    expect(fsPromises.readFile).toHaveBeenCalledWith(
      '/tmp/storage/git-cache/abc123.json',
      'utf-8'
    );
  });

  it('returns empty graph data on cache misses and parse failures', async () => {
    const fsPromises = createFsPromises();

    fsPromises.access.mockRejectedValueOnce(new Error('ENOENT'));
    await expect(
      readCachedGraphData({ fsPath: '/tmp/storage' } as never, 'abc123', fsPromises as never)
    ).resolves.toEqual({ nodes: [], edges: [] });

    fsPromises.access.mockResolvedValueOnce(undefined);
    fsPromises.readFile.mockRejectedValueOnce(new Error('bad read'));
    await expect(
      readCachedGraphData({ fsPath: '/tmp/storage' } as never, 'abc123', fsPromises as never)
    ).resolves.toEqual({ nodes: [], edges: [] });
  });

  it('returns empty graph data when storage is unavailable', async () => {
    const fsPromises = createFsPromises();

    await expect(readCachedGraphData(undefined, 'abc123', fsPromises as never)).resolves.toEqual({
      nodes: [],
      edges: [],
    });
    expect(fsPromises.access).not.toHaveBeenCalled();
  });

  it('writes cache files with recursive directory creation', async () => {
    const fsPromises = createFsPromises();
    const graphData: IGraphData = { nodes: [], edges: [] };

    await writeCachedGraphData(
      { fsPath: '/tmp/storage' } as never,
      'abc123',
      graphData,
      fsPromises as never
    );

    expect(fsPromises.mkdir).toHaveBeenCalledWith('/tmp/storage/git-cache', { recursive: true });
    expect(fsPromises.writeFile).toHaveBeenCalledWith(
      '/tmp/storage/git-cache/abc123.json',
      JSON.stringify(graphData),
      'utf-8'
    );
  });

  it('skips writes when storage is unavailable', async () => {
    const fsPromises = createFsPromises();

    await writeCachedGraphData(undefined, 'abc123', { nodes: [], edges: [] }, fsPromises as never);

    expect(fsPromises.mkdir).not.toHaveBeenCalled();
    expect(fsPromises.writeFile).not.toHaveBeenCalled();
  });

  it('removes the cache directory and swallows missing-directory failures', async () => {
    const fsPromises = createFsPromises();

    await removeGitCacheDir({ fsPath: '/tmp/storage' } as never, fsPromises as never);
    expect(fsPromises.rm).toHaveBeenCalledWith('/tmp/storage/git-cache', {
      recursive: true,
      force: true,
    });

    fsPromises.rm.mockRejectedValueOnce(new Error('missing'));
    await expect(
      removeGitCacheDir({ fsPath: '/tmp/storage' } as never, fsPromises as never)
    ).resolves.toBeUndefined();
  });
});
