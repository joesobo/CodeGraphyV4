import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_COLOR } from '../../../../src/shared/contracts';
import { buildWorkspaceGraphNodes } from '../../../../src/extension/workspaceAnalyzer/graph/nodes';

describe('workspaceAnalyzer/graph/nodes', () => {
  it('builds nodes with labels, sizes, and access counts', () => {
    const nodes = buildWorkspaceGraphNodes({
      cacheFiles: {
        'src/index.ts': { size: 12 },
        'src/utils.ts': { size: 7 },
      },
      connectedIds: new Set<string>(['src/index.ts']),
      nodeIds: new Set<string>(['src/index.ts', 'src/utils.ts']),
      showOrphans: true,
      visitCounts: {
        'src/index.ts': 3,
      },
    });

    expect(nodes).toEqual([
      {
        id: 'src/index.ts',
        label: 'index.ts',
        color: DEFAULT_NODE_COLOR,
        fileSize: 12,
        accessCount: 3,
      },
      {
        id: 'src/utils.ts',
        label: 'utils.ts',
        color: DEFAULT_NODE_COLOR,
        fileSize: 7,
        accessCount: 0,
      },
    ]);
  });

  it('omits orphan nodes when showOrphans is false', () => {
    const nodes = buildWorkspaceGraphNodes({
      cacheFiles: {},
      connectedIds: new Set<string>(['src/index.ts']),
      nodeIds: new Set<string>(['src/index.ts', 'src/orphan.ts']),
      showOrphans: false,
      visitCounts: {},
    });

    expect(nodes).toEqual([
      {
        id: 'src/index.ts',
        label: 'index.ts',
        color: DEFAULT_NODE_COLOR,
        fileSize: undefined,
        accessCount: 0,
      },
    ]);
  });
});
