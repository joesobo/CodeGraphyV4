import { describe, it, expect, vi, beforeEach } from 'vitest';
import { walkDirectory } from '../../../../src/core/discovery/file/walk';
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
    expect(onFile).toHaveBeenCalledWith('app.ts', '/root/app.ts');
    expect(onFile).toHaveBeenCalledWith('index.ts', '/root/index.ts');
  });

  it('recursively walks subdirectories', async () => {
    mockReaddir
      .mockResolvedValueOnce([makeDirent('src', true)] as fs.Dirent<NonSharedBuffer>[])
      .mockResolvedValueOnce([makeDirent('main.ts', false)] as fs.Dirent<NonSharedBuffer>[]);

    const onFile = vi.fn().mockReturnValue(true);

    await walkDirectory('/root', '/root', onFile);

    expect(onFile).toHaveBeenCalledWith('src/main.ts', '/root/src/main.ts');
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
    expect(onFile).toHaveBeenCalledWith('app.ts', '/root/app.ts');
  });

  it('skips .git directory', async () => {
    mockReaddir.mockResolvedValueOnce([
      makeDirent('.git', true),
      makeDirent('app.ts', false),
    ] as fs.Dirent<NonSharedBuffer>[]);

    const onFile = vi.fn().mockReturnValue(true);

    await walkDirectory('/root', '/root', onFile);

    expect(onFile).toHaveBeenCalledTimes(1);
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
