import { describe, expect, it } from 'vitest';
import {
  collectCachedDirectoryPaths,
  createCachedWorkspaceDiscoveryState,
} from '../../../../../src/extension/pipeline/service/cache/cachedDiscovery';

describe('pipeline/service/cache/cachedDiscovery', () => {
  it('derives discovered file and directory metadata from cached relative paths', () => {
    expect(
      createCachedWorkspaceDiscoveryState(
        '/workspace',
        ['src/nested/cached.ts', 'README.md'],
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
});
