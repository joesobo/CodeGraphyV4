import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../../../../src/webview/components/graph/model/build';
import {
  createDragGroupSession,
  createNodeMap,
  getDragEndNodes,
} from '../../../../../../../src/webview/components/graph/runtime/use/interaction/nodeDrag/group';

function node(id: string): FGNode {
  return { id, x: 0, y: 0 } as FGNode;
}

describe('graph/runtime/use/interaction/nodeDrag/group', () => {
  it('indexes graph nodes by id', () => {
    const first = node('first');
    const second = node('second');

    expect(createNodeMap([first, second])).toEqual(new Map([
      ['first', first],
      ['second', second],
    ]));
  });

  it('creates a drag group for selected 2d graph nodes', () => {
    const primary = node('primary');
    const sibling = node('sibling');

    expect(createDragGroupSession(primary, {
      graphData: { nodes: [primary, sibling] },
      graphMode: '2d',
      selectedNodeIds: new Set(['primary', 'sibling', 'missing']),
    })).toEqual({
      draggedNodeIds: new Set(['primary', 'sibling']),
      primaryNodeId: 'primary',
    });
  });

  it('does not create a drag group outside selected multi-node drags', () => {
    const primary = node('primary');
    const sibling = node('sibling');
    const graphData = { nodes: [primary, sibling] };

    expect(createDragGroupSession(primary, {
      graphData,
      graphMode: '2d',
      selectedNodeIds: new Set(['sibling']),
    })).toBeNull();
    expect(createDragGroupSession(primary, {
      graphData,
      graphMode: '2d',
      selectedNodeIds: new Set(['primary']),
    })).toBeNull();
    expect(createDragGroupSession(primary, {
      graphData: { nodes: [primary] },
      graphMode: '2d',
      selectedNodeIds: new Set(['primary', 'missing']),
    })).toBeNull();
  });

  it('returns the primary node when drag end has no group session', () => {
    const primary = node('primary');

    expect(getDragEndNodes(primary, null, { nodes: [] })).toEqual([primary]);
  });

  it('returns existing group nodes and ignores missing group ids', () => {
    const primary = node('primary');
    const sibling = node('sibling');

    expect(getDragEndNodes(primary, {
      draggedNodeIds: new Set(['primary', 'missing', 'sibling']),
      primaryNodeId: 'primary',
    }, {
      nodes: [sibling],
    })).toEqual([primary, sibling]);
  });
});
