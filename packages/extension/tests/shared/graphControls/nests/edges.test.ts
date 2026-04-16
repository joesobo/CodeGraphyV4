import { describe, expect, it } from 'vitest';
import { buildContainmentEdges } from '../../../../src/shared/graphControls/nests/edges';

describe('shared/graphControls/nests/edges', () => {
  it('builds structural nests edges for parent folders and files', () => {
    expect(buildContainmentEdges(
      new Set(['(root)', 'src', 'src/lib']),
      [
        { id: 'src/lib/a.ts', label: 'a.ts', color: '#111111' },
        { id: 'README.md', label: 'README.md', color: '#222222' },
      ],
    )).toEqual([
      {
        id: '(root)->src#codegraphy:nests',
        from: '(root)',
        to: 'src',
        kind: 'codegraphy:nests',
        sources: [],
      },
      {
        id: 'src->src/lib#codegraphy:nests',
        from: 'src',
        to: 'src/lib',
        kind: 'codegraphy:nests',
        sources: [],
      },
      {
        id: 'src/lib->src/lib/a.ts#codegraphy:nests',
        from: 'src/lib',
        to: 'src/lib/a.ts',
        kind: 'codegraphy:nests',
        sources: [],
      },
      {
        id: '(root)->README.md#codegraphy:nests',
        from: '(root)',
        to: 'README.md',
        kind: 'codegraphy:nests',
        sources: [],
      },
    ]);
  });
});
