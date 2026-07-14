import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_COLOR } from '../../src/fileColors';
import { buildWorkspaceGraphNodes } from '../../src/graph/nodes';

describe('core/graph/nodes', () => {
  it('builds nodes with labels and file sizes', () => {
    const nodes = buildWorkspaceGraphNodes({
      cacheFiles: {
        'src/index.ts': { size: 12 },
        'src/utils.ts': { size: 7 },
      },
      connectedIds: new Set<string>(['src/index.ts']),
      nodeIds: new Set<string>(['src/index.ts', 'src/utils.ts']),
      showOrphans: true,
    });

    expect(nodes).toEqual([
      {
        id: 'src/index.ts',
        label: 'index.ts',
        color: DEFAULT_NODE_COLOR,
        fileSize: 12,
      },
      {
        id: 'src/utils.ts',
        label: 'utils.ts',
        color: DEFAULT_NODE_COLOR,
        fileSize: 7,
      },
    ]);
  });

  it('omits orphan nodes when showOrphans is false', () => {
    const nodes = buildWorkspaceGraphNodes({
      cacheFiles: {},
      connectedIds: new Set<string>(['src/index.ts']),
      nodeIds: new Set<string>(['src/index.ts', 'src/orphan.ts']),
      showOrphans: false,
    });

    expect(nodes).toEqual([
      {
        id: 'src/index.ts',
        label: 'index.ts',
        color: DEFAULT_NODE_COLOR,
        fileSize: undefined,
      },
    ]);
  });

  it('annotates gitignored file and folder nodes without hiding them', () => {
    const nodes = buildWorkspaceGraphNodes({
      cacheFiles: {
        'generated/output.ts': { size: 12 },
      },
      connectedIds: new Set<string>(),
      directoryPaths: ['generated'],
      gitIgnoredPaths: ['generated', 'generated/output.ts'],
      nodeIds: new Set<string>(['generated/output.ts']),
      showOrphans: true,
    });

    expect(nodes).toEqual([
      expect.objectContaining({
        id: 'generated/output.ts',
        metadata: {
          gitIgnored: true,
          gitIgnoredReason: 'Git ignored',
        },
      }),
      expect.objectContaining({
        id: 'generated',
        nodeType: 'folder',
        metadata: {
          gitIgnored: true,
          gitIgnoredReason: 'Git ignored',
        },
      }),
    ]);
  });
});
