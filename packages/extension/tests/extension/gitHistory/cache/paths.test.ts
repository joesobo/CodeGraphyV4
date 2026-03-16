import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  Uri: {
    joinPath: vi.fn((...args: unknown[]) => {
      const parts = args.map((value) => String((value as { fsPath?: string }).fsPath ?? value));
      return { fsPath: parts.join('/') };
    }),
  },
}));

import { getCacheDir, getCachePath } from '../../../../src/extension/gitHistory/cache/paths';

describe('gitHistory/cache/paths', () => {
  it('returns null paths when storage is unavailable', () => {
    expect(getCacheDir(undefined)).toBeNull();
    expect(getCachePath(undefined, 'abc123')).toBeNull();
  });

  it('builds cache directory and file paths from the storage uri', () => {
    const storageUri = { fsPath: '/tmp/storage' } as never;

    expect(getCacheDir(storageUri)).toBe('/tmp/storage/git-cache');
    expect(getCachePath(storageUri, 'abc123')).toBe('/tmp/storage/git-cache/abc123.json');
  });
});
