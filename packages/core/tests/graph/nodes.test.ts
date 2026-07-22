import { describe, expect, it } from 'vitest';
import { buildWorkspaceGraphNodes } from '../../src/graph/nodes';

describe('core/graph/nodes', () => {
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
