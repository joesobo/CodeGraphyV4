import { beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  collectCachedGitIgnoredPaths,
  collectCachedDirectoryPaths,
  createCachedWorkspaceDiscoveryState,
} from '../../../../../src/extension/pipeline/service/cache/cachedDiscovery';

const childProcessMock = vi.hoisted(() => ({
  spawnSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  ...childProcessMock,
  default: childProcessMock,
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
    expect(spawnSync).toHaveBeenCalledWith(
      'git',
      ['-C', '/workspace', 'check-ignore', '--stdin'],
      {
        encoding: 'utf8',
        input: 'src\nsrc/nested\nsrc/nested/cached.ts\nREADME.md\n',
      },
    );
  });

  it('normalizes windows separators while deriving cached directory ancestry', () => {
    expect(
      collectCachedDirectoryPaths([
        'src\\nested\\cached.ts',
        'src\\other\\child.ts',
      ]),
    ).toEqual([
      'src',
      'src/nested',
      'src/other',
    ]);
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

  it('maps git-normalized ignored paths back to cached relative paths', () => {
    vi.mocked(spawnSync).mockReturnValue({
      error: undefined,
      status: 0,
      stdout: 'src/generated.ts\nexternal/generated.ts\n',
    } as never);

    expect(
      collectCachedGitIgnoredPaths(
        '/workspace',
        ['src\\generated.ts'],
        true,
      ),
    ).toEqual(['src\\generated.ts', 'external/generated.ts']);
    expect(spawnSync).toHaveBeenCalledWith(
      'git',
      ['-C', '/workspace', 'check-ignore', '--stdin'],
      {
        encoding: 'utf8',
        input: 'src/generated.ts\n',
      },
    );
  });

  it('returns no ignored paths when git check-ignore fails', () => {
    vi.mocked(spawnSync).mockReturnValueOnce({
      error: undefined,
      status: 2,
      stdout: 'src/generated.ts\n',
    } as never);

    expect(
      collectCachedGitIgnoredPaths(
        '/workspace',
        ['src/generated.ts'],
        true,
      ),
    ).toEqual([]);

    vi.mocked(spawnSync).mockReturnValueOnce({
      error: new Error('git failed'),
      status: 0,
      stdout: 'src/generated.ts\n',
    } as never);

    expect(
      collectCachedGitIgnoredPaths(
        '/workspace',
        ['src/generated.ts'],
        true,
      ),
    ).toEqual([]);
  });

  it('skips git when gitignore handling is disabled', () => {
    expect(collectCachedGitIgnoredPaths('/workspace', ['src/generated.ts'], false)).toEqual([]);
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('skips git when there are no cached paths to check', () => {
    expect(collectCachedGitIgnoredPaths('/workspace', [], true)).toEqual([]);
    expect(spawnSync).not.toHaveBeenCalled();
  });
});
