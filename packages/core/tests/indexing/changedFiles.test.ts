import { describe, expect, it } from 'vitest';
import {
  mapDiscoveredWorkspaceIndexFilesByRelativePath,
  selectDiscoveredWorkspaceIndexFileChanges,
} from '../../src/indexing/changedFiles';
import type { IDiscoveredFile } from '../../src/discovery/contracts';

function discovered(relativePath: string): IDiscoveredFile {
  const name = relativePath.split('/').at(-1) ?? relativePath;
  return {
    absolutePath: `/workspace/${relativePath}`,
    extension: name.includes('.') ? name.slice(name.lastIndexOf('.')) : '',
    name,
    relativePath,
  };
}

describe('indexing/changedFiles', () => {
  it('selects exact changed files from absolute or relative paths', () => {
    const files = [
      discovered('src/app.ts'),
      discovered('src/util.ts'),
    ];
    const byRelativePath = mapDiscoveredWorkspaceIndexFilesByRelativePath(files);

    expect(
      selectDiscoveredWorkspaceIndexFileChanges(
        '/workspace',
        ['/workspace/src/app.ts', 'src/util.ts'],
        byRelativePath,
      ),
    ).toEqual({
      files,
      unmatchedFilePaths: [],
    });
  });

  it('expands changed directories to descendant discovered files', () => {
    const files = [
      discovered('src/app.ts'),
      discovered('src/nested/util.ts'),
      discovered('README.md'),
    ];

    expect(
      selectDiscoveredWorkspaceIndexFileChanges(
        '/workspace',
        ['/workspace/src'],
        mapDiscoveredWorkspaceIndexFilesByRelativePath(files),
      ),
    ).toEqual({
      files: files.slice(0, 2),
      unmatchedFilePaths: [],
    });
  });

  it('reports unmatched in-workspace paths and ignores paths outside the workspace', () => {
    const files = [discovered('src/app.ts')];

    expect(
      selectDiscoveredWorkspaceIndexFileChanges(
        '/workspace',
        ['/workspace/missing.ts', '/outside/app.ts'],
        mapDiscoveredWorkspaceIndexFilesByRelativePath(files),
      ),
    ).toEqual({
      files: [],
      unmatchedFilePaths: ['/workspace/missing.ts'],
    });
  });
});
