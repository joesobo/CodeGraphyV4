import { beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  collectCachedGitIgnoredPaths,
  createCachedWorkspaceDiscoveryState,
} from '../../../../../src/extension/pipeline/service/cache/cachedDiscovery';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

describe('pipeline/service/cache/cachedDiscovery', () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockReset();
  });

  it('derives discovered file and directory metadata from cached relative paths', () => {
    vi.mocked(spawnSync).mockReturnValue({
      error: undefined,
      status: 1,
      stdout: '',
    } as never);

    expect(
      createCachedWorkspaceDiscoveryState(
        '/workspace',
        ['src/nested/cached.ts', 'README.md'],
        true,
      ),
    ).toEqual({
      directories: ['src', 'src/nested'],
      files: [
        {
          absolutePath: '/workspace/src/nested/cached.ts',
          extension: '.ts',
          name: 'cached.ts',
          relativePath: 'src/nested/cached.ts',
        },
        {
          absolutePath: '/workspace/README.md',
          extension: '.md',
          name: 'README.md',
          relativePath: 'README.md',
        },
      ],
      gitIgnoredPaths: [],
    });
  });

  it('collects current gitignore matches only for cached paths', () => {
    vi.mocked(spawnSync).mockReturnValue({
      error: undefined,
      status: 0,
      stdout: 'src/generated.ts\n',
    } as never);

    expect(
      collectCachedGitIgnoredPaths(
        '/workspace',
        ['src', 'src/generated.ts', 'src/kept.ts'],
        true,
      ),
    ).toEqual(['src/generated.ts']);
    expect(spawnSync).toHaveBeenCalledWith(
      'git',
      ['-C', '/workspace', 'check-ignore', '--stdin'],
      {
        encoding: 'utf8',
        input: 'src\nsrc/generated.ts\nsrc/kept.ts\n',
      },
    );
  });

  it('skips git when gitignore handling is disabled', () => {
    expect(collectCachedGitIgnoredPaths('/workspace', ['src/generated.ts'], false)).toEqual([]);
    expect(spawnSync).not.toHaveBeenCalled();
  });
});
