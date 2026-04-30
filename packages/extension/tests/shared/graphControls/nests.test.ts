import { describe, expect, it } from 'vitest';
import {
  collectFolderPaths,
  createFolderNodes,
} from '../../../src/shared/graphControls/nests/folders';
import { buildContainmentEdges } from '../../../src/shared/graphControls/nests/edges';

describe('shared/graphControls/nests', () => {
  it('collects nested folders and the synthetic root when needed', () => {
    const result = collectFolderPaths([
      { id: 'src/app.ts', label: 'app.ts', color: '#111111' },
      { id: 'README.md', label: 'README.md', color: '#222222' },
    ]);

    expect(result).toEqual({
      paths: new Set(['src', '(root)']),
      hasRootFiles: true,
    });
  });

  it('creates folder nodes with the configured color', () => {
    expect(createFolderNodes(new Set(['src', 'src/lib']), '#123456')).toEqual([
      { id: 'src', label: 'src', color: '#123456', nodeType: 'folder' },
      { id: 'src/lib', label: 'lib', color: '#123456', nodeType: 'folder' },
    ]);
  });

  it('builds structural nests edges for parent folders and files', () => {
    expect(buildContainmentEdges(
      new Set(['(root)', 'src', 'src/lib']),
      [
        { id: 'src/lib/a.ts', label: 'a.ts', color: '#111111' },
        { id: 'README.md', label: 'README.md', color: '#222222' },
      ],
    )).toEqual([
      {
        id: '(root)->src#nests',
        from: '(root)',
        to: 'src',
        kind: 'nests',
        sources: [],
      },
      {
        id: 'src->src/lib#nests',
        from: 'src',
        to: 'src/lib',
        kind: 'nests',
        sources: [],
      },
      {
        id: 'src/lib->src/lib/a.ts#nests',
        from: 'src/lib',
        to: 'src/lib/a.ts',
        kind: 'nests',
        sources: [],
      },
      {
        id: '(root)->README.md#nests',
        from: '(root)',
        to: 'README.md',
        kind: 'nests',
        sources: [],
      },
    ]);
  });
});
