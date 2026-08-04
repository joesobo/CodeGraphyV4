import { describe, expect, it } from 'vitest';
import {
  collectWorkspaceCacheUpdatePaths,
} from '../../../../src/extension/workspaceFiles/cacheUpdates/paths';

describe('workspaceFiles/cacheUpdates/paths', () => {
  it('keeps workspace source and lifecycle paths without a cache feedback loop', () => {
    expect(collectWorkspaceCacheUpdatePaths('/workspace', [
      '/workspace/src/app.ts',
      '/workspace/.gitignore',
      '/workspace/packages/example/.gitignore',
      '/workspace/.git/index',
      '/workspace/.git/info/exclude',
      '/workspace/.codegraphy/settings.json',
      '/workspace/.codegraphy/graph.sqlite',
      '/workspace/.codegraphy/graph.sqlite-wal',
      '/workspace/node_modules/package/index.js',
      '/workspace/dist/generated.js',
      '/workspace/src/app.js.map',
      '/other/src/app.ts',
      '/workspace',
    ])).toEqual([
      '/workspace/src/app.ts',
      '/workspace/.gitignore',
      '/workspace/packages/example/.gitignore',
      '/workspace/.git/index',
      '/workspace/.git/info/exclude',
      '/workspace/.codegraphy/settings.json',
    ]);
  });
});
