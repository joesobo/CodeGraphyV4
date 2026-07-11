import { describe, it, expect, vi, beforeEach } from 'vitest';
import { walkDirectory } from '../../../src/discovery/file/walk';
import * as fs from 'fs';

vi.mock('fs', () => ({
  promises: {
    readdir: vi.fn(),
  },
}));

const mockReaddir = vi.mocked(fs.promises.readdir);

function makeDirent(name: string, isDir: boolean): fs.Dirent<NonSharedBuffer> {
  return {
    name: name as unknown as NonSharedBuffer,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    parentPath: '',
    path: '',
  } as unknown as fs.Dirent<NonSharedBuffer>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('walkDirectory', () => {
  it('calls onFile for each file found in the directory', async () => {
    mockReaddir.mockResolvedValueOnce([
      makeDirent('app.ts', false),
      makeDirent('index.ts', false),
    ] as fs.Dirent<NonSharedBuffer>[]);

    const onFile = vi.fn().mockReturnValue(true);

    const result = await walkDirectory('/root', '/root', onFile);

    expect(result).toBe(true);
    expect(onFile).toHaveBeenCalledTimes(2);
    expect(onFile).toHaveBeenCalledWith(
      'app.ts',
      '/root/app.ts',
      new Set(['app.ts', 'index.ts']),
    );
    expect(onFile).toHaveBeenCalledWith(
      'index.ts',
      '/root/index.ts',
      new Set(['app.ts', 'index.ts']),
    );
  });

  it('recursively walks subdirectories', async () => {
    mockReaddir
      .mockResolvedValueOnce([makeDirent('src', true)] as fs.Dirent<NonSharedBuffer>[])
      .mockResolvedValueOnce([makeDirent('main.ts', false)] as fs.Dirent<NonSharedBuffer>[]);

    const onFile = vi.fn().mockReturnValue(true);

    await walkDirectory('/root', '/root', onFile);

    expect(onFile).toHaveBeenCalledWith(
      'src/main.ts',
      '/root/src/main.ts',
      new Set(['main.ts']),
    );
  });

  it('notifies callers when walking a refreshable subdirectory', async () => {
    mockReaddir
      .mockResolvedValueOnce([makeDirent('src', true)] as fs.Dirent<NonSharedBuffer>[])
      .mockResolvedValueOnce([makeDirent('main.ts', false)] as fs.Dirent<NonSharedBuffer>[]);

    const onFile = vi.fn().mockReturnValue(true);
    const onDirectory = vi.fn();

    await walkDirectory('/root', '/root', onFile, onDirectory);

    expect(onDirectory).toHaveBeenCalledWith('src', '/root/src');
  });

  it('skips node_modules directory', async () => {
    mockReaddir.mockResolvedValueOnce([
      makeDirent('node_modules', true),
      makeDirent('app.ts', false),
    ] as fs.Dirent<NonSharedBuffer>[]);

    const onFile = vi.fn().mockReturnValue(true);

    await walkDirectory('/root', '/root', onFile);

    // Should not recurse into node_modules
    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile).toHaveBeenCalledWith(
      'app.ts',
      '/root/app.ts',
      new Set(['node_modules', 'app.ts']),
    );
    expect(mockReaddir).toHaveBeenCalledTimes(1);
  });

  it('skips .git directory', async () => {
    mockReaddir.mockResolvedValueOnce([
      makeDirent('.git', true),
      makeDirent('app.ts', false),
    ] as fs.Dirent<NonSharedBuffer>[]);

    const onFile = vi.fn().mockReturnValue(true);

    await walkDirectory('/root', '/root', onFile);

    expect(onFile).toHaveBeenCalledTimes(1);
    expect(mockReaddir).toHaveBeenCalledTimes(1);
  });

  it('skips .codegraphy directory', async () => {
    mockReaddir.mockResolvedValueOnce([
      makeDirent('.codegraphy', true),
      makeDirent('app.ts', false),
    ] as fs.Dirent<NonSharedBuffer>[]);

    const onFile = vi.fn().mockReturnValue(true);
    const onDirectory = vi.fn();

    await walkDirectory('/root', '/root', onFile, onDirectory);

    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile).toHaveBeenCalledWith(
      'app.ts',
      '/root/app.ts',
      new Set(['.codegraphy', 'app.ts']),
    );
    expect(onDirectory).not.toHaveBeenCalledWith('.codegraphy', '/root/.codegraphy');
    expect(mockReaddir).toHaveBeenCalledTimes(1);
  });

  it('stops walking when onFile returns false', async () => {
    mockReaddir.mockResolvedValueOnce([
      makeDirent('first.ts', false),
      makeDirent('second.ts', false),
    ] as fs.Dirent<NonSharedBuffer>[]);

    const onFile = vi.fn().mockReturnValueOnce(false);

    const result = await walkDirectory('/root', '/root', onFile);

    expect(result).toBe(false);
    expect(onFile).toHaveBeenCalledTimes(1);
  });

  it('stops walking when recursive call indicates stop', async () => {
    mockReaddir
      .mockResolvedValueOnce([
        makeDirent('src', true),
        makeDirent('lib', true),
      ] as fs.Dirent<NonSharedBuffer>[])
      .mockResolvedValueOnce([makeDirent('a.ts', false)] as fs.Dirent<NonSharedBuffer>[]);

    const onFile = vi.fn().mockReturnValue(false);

    const result = await walkDirectory('/root', '/root', onFile);

    expect(result).toBe(false);
  });

  it('returns true when readdir throws an error', async () => {
    mockReaddir.mockRejectedValueOnce(new Error('ENOENT'));

    const onFile = vi.fn();

    const result = await walkDirectory('/root', '/root/missing', onFile);

    expect(result).toBe(true);
    expect(onFile).not.toHaveBeenCalled();
  });

  it('throws when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const onFile = vi.fn();

    await expect(walkDirectory('/root', '/root', onFile, controller.signal))
      .rejects.toThrow('Discovery aborted');
  });

  it('uses the fifth parameter as the abort signal when a directory listener is passed', async () => {
    const controller = new AbortController();
    controller.abort();

    const onFile = vi.fn();
    const onDirectory = vi.fn();

    await expect(walkDirectory('/root', '/root', onFile, onDirectory, controller.signal))
      .rejects.toThrow('Discovery aborted');
  });

  it('checks abort signal for each directory entry', async () => {
    const controller = new AbortController();

    mockReaddir.mockResolvedValueOnce([
      makeDirent('first.ts', false),
      makeDirent('second.ts', false),
    ] as fs.Dirent<NonSharedBuffer>[]);

    const onFile = vi.fn().mockImplementationOnce(() => {
      controller.abort();
      return true;
    });

    await expect(walkDirectory('/root', '/root', onFile, controller.signal))
      .rejects.toThrow('Discovery aborted');
  });

  it('ignores entries that are neither files nor directories', async () => {
    const symlink: fs.Dirent<NonSharedBuffer> = {
      name: 'link' as unknown as NonSharedBuffer,
      isDirectory: () => false,
      isFile: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      isSymbolicLink: () => true,
      parentPath: '',
      path: '',
    } as unknown as fs.Dirent<NonSharedBuffer>;
    mockReaddir.mockResolvedValueOnce([symlink] as fs.Dirent<NonSharedBuffer>[]);

    const onFile = vi.fn();

    const result = await walkDirectory('/root', '/root', onFile);

    expect(result).toBe(true);
    expect(onFile).not.toHaveBeenCalled();
  });

  it('handles an empty directory', async () => {
    mockReaddir.mockResolvedValueOnce([] as fs.Dirent<NonSharedBuffer>[]);

    const onFile = vi.fn();

    const result = await walkDirectory('/root', '/root', onFile);

    expect(result).toBe(true);
    expect(onFile).not.toHaveBeenCalled();
  });
});
