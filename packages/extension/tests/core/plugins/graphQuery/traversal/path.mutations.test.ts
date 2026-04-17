import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../src/core/plugins/graphQuery/index/cache', () => ({
  getGraphIndex: vi.fn(),
}));

import { getGraphIndex } from '../../../../../src/core/plugins/graphQuery/index/cache';
import { findNodePath } from '../../../../../src/core/plugins/graphQuery/traversal/path';
import type { IGraphNode } from '../../../../../src/shared/graph/contracts';

describe('core/plugins/graphQuery/path mutant guards', () => {
  it('stops exploring once repeated cycle neighbors have already been visited', () => {
    const nodeById = new Map<string, IGraphNode>([
      ['a.ts', { id: 'a.ts', label: 'a.ts', color: '#fff' }],
      ['b.ts', { id: 'b.ts', label: 'b.ts', color: '#fff' }],
      ['c.ts', { id: 'c.ts', label: 'c.ts', color: '#fff' }],
    ]);
    const outNeighbors = vi.fn((nodeId: string) => {
      if (outNeighbors.mock.calls.length > 3) {
        throw new Error(`revisited ${nodeId}`);
      }

      if (nodeId === 'a.ts') {
        return ['b.ts'];
      }
      if (nodeId === 'b.ts') {
        return ['a.ts', 'c.ts'];
      }
      return [];
    });

    vi.mocked(getGraphIndex).mockReturnValue({
      graph: {
        hasNode: (nodeId: string) => nodeById.has(nodeId),
        outNeighbors,
      },
      nodeById,
    } as never);

    expect(findNodePath('a.ts', 'c.ts', () => ({ nodes: [], edges: [] }))).toEqual([
      nodeById.get('a.ts'),
      nodeById.get('b.ts'),
      nodeById.get('c.ts'),
    ]);
    expect(outNeighbors).toHaveBeenCalledTimes(3);
  });
});
