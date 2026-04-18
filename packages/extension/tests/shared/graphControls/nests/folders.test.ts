import { describe, expect, it } from 'vitest';
import { collectFolderPaths, createFolderNodes } from '../../../../src/shared/graphControls/nests/folders';

describe('shared/graphControls/nests/folders', () => {
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
});
