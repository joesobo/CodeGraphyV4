import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  applyNodeDrag,
  releaseDraggedNodes,
} from '../../../../../../src/webview/components/graph/runtime/use/interaction/nodeDrag';

describe('graph/runtime/use/interaction node drag', () => {
  it('moves the selected node group by the live drag delta', () => {
    const primary = { id: 'primary', x: 15, y: 12 } as FGNode;
    const sibling = { id: 'sibling', vx: 1, vy: 2, x: 30, y: 40 } as FGNode;
    const outside = { id: 'outside', x: 90, y: 90 } as FGNode;

    const session = applyNodeDrag(primary, { x: 5, y: -3 }, {
      graphData: { nodes: [primary, sibling, outside] },
      graphMode: '2d',
      selectedNodeIds: new Set(['primary', 'sibling']),
    });

    expect(session?.draggedNodeIds).toEqual(new Set(['primary', 'sibling']));
    expect(primary.isDragging).toBe(true);
    expect(sibling).toMatchObject({
      fx: 35,
      fy: 37,
      isDragging: true,
      vx: 0,
      vy: 0,
      x: 35,
      y: 37,
    });
    expect(outside).toMatchObject({ x: 90, y: 90 });
  });

  it('keeps the same selected drag group for later drag events', () => {
    const primary = { id: 'primary', x: 15, y: 12 } as FGNode;
    const sibling = { id: 'sibling', x: 30, y: 40 } as FGNode;
    const session = applyNodeDrag(primary, { x: 5, y: 5 }, {
      graphData: { nodes: [primary, sibling] },
      graphMode: '2d',
      selectedNodeIds: new Set(['primary', 'sibling']),
    });

    const nextSession = applyNodeDrag(primary, { x: 2, y: 3 }, {
      graphData: { nodes: [primary, sibling] },
      graphMode: '2d',
      selectedNodeIds: new Set(['primary']),
    }, session);

    expect(nextSession).toBe(session);
    expect(sibling).toMatchObject({
      fx: 37,
      fy: 48,
      x: 37,
      y: 48,
    });
  });

  it('does not create a group drag outside 2d multi-selection', () => {
    const primary = { id: 'primary', x: 15, y: 12 } as FGNode;
    const sibling = { id: 'sibling', x: 30, y: 40 } as FGNode;

    const in3d = applyNodeDrag(primary, { x: 5, y: 5 }, {
      graphData: { nodes: [primary, sibling] },
      graphMode: '3d',
      selectedNodeIds: new Set(['primary', 'sibling']),
    });
    const single = applyNodeDrag(primary, { x: 5, y: 5 }, {
      graphData: { nodes: [primary, sibling] },
      graphMode: '2d',
      selectedNodeIds: new Set(['primary']),
    });

    expect(in3d).toBeNull();
    expect(single).toBeNull();
    expect(sibling).toMatchObject({ x: 30, y: 40 });
  });

  it('releases every dragged node from fixed drag coordinates', () => {
    const primary = { id: 'primary', fx: 15, fy: 12, isDragging: true } as FGNode;
    const sibling = { id: 'sibling', fx: 30, fy: 40, isDragging: true } as FGNode;

    releaseDraggedNodes(primary, {
      draggedNodeIds: new Set(['primary', 'sibling']),
      primaryNodeId: 'primary',
    }, {
      graphData: { nodes: [primary, sibling] },
      graphMode: '2d',
    });

    expect(primary).toMatchObject({ isDragging: false });
    expect(sibling).toMatchObject({ isDragging: false });
    expect(primary.fx).toBeUndefined();
    expect(primary.fy).toBeUndefined();
    expect(sibling.fx).toBeUndefined();
    expect(sibling.fy).toBeUndefined();
  });
});
