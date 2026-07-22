import { describe, expect, it } from 'vitest';
import { getFileColor } from '../../src/fileColors';
import { buildWorkspaceFileNodes } from '../../src/graph/fileNodes';

describe('core/graph/fileNodes', () => {
  it('builds File Nodes with resolved colors, labels, and sizes', () => {
    const nodes = buildWorkspaceFileNodes({
      cacheFiles: {
        'src/index.ts': { size: 12 },
        'src/utils.py': { size: 7 },
      },
      connectedIds: new Set<string>(['src/index.ts']),
      gitIgnoredPathSet: new Set<string>(),
      nodeIds: new Set<string>(['src/index.ts', 'src/utils.py']),
      showOrphans: true,
    });

    expect(nodes).toEqual([
      {
        id: 'src/index.ts',
        label: 'index.ts',
        color: getFileColor('.ts'),
        fileSize: 12,
      },
      {
        id: 'src/utils.py',
        label: 'utils.py',
        color: getFileColor('.py'),
        fileSize: 7,
      },
    ]);
  });

  it('omits orphan File Nodes when Show Orphans is off', () => {
    const nodes = buildWorkspaceFileNodes({
      cacheFiles: {},
      connectedIds: new Set<string>(['src/index.ts']),
      gitIgnoredPathSet: new Set<string>(),
      nodeIds: new Set<string>(['src/index.ts', 'src/orphan.ts']),
      showOrphans: false,
    });

    expect(nodes).toEqual([
      {
        id: 'src/index.ts',
        label: 'index.ts',
        color: getFileColor('.ts'),
        fileSize: undefined,
      },
    ]);
  });
});
