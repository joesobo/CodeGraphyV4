import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  addCappedNodeVelocity,
  addNodeVelocity,
  getNodeDelta,
  moveNodePosition,
  translateNodePosition,
} from '../../../../../../src/webview/components/graph/runtime/physics/motion';

describe('webview/components/graph/runtime/physics/motion', () => {
  it('measures node deltas from finite coordinates with a non-zero distance floor', () => {
    expect(getNodeDelta(createNode({ x: 1, y: 2 }), createNode({ x: 4, y: 6 }))).toEqual({
      distance: 5,
      x: 3,
      y: 4,
    });
    expect(getNodeDelta(createNode({ x: 1, y: 1 }), createNode({ x: 1, y: 1 })).distance).toBe(1);
  });

  it('uses zero for missing coordinates when measuring or moving nodes', () => {
    const node = createNode();

    expect(getNodeDelta(node, createNode({ x: 2, y: Number.NaN }))).toEqual({
      distance: 2,
      x: 2,
      y: 0,
    });

    moveNodePosition(node, 7, -3);

    expect(node.x).toBe(7);
    expect(node.y).toBe(-3);
  });

  it('adds uncapped velocity to the current node velocity', () => {
    const node = createNode({ vx: 1, vy: 2 });

    addNodeVelocity(node, 3, 4);

    expect(node.vx).toBe(4);
    expect(node.vy).toBe(6);
  });

  it('scales large velocity impulses without changing small impulses', () => {
    const largeImpulse = createNode();
    const smallImpulse = createNode();

    addCappedNodeVelocity(largeImpulse, 6, 8, 5);
    addCappedNodeVelocity(smallImpulse, 2, 1, 5);

    expect(largeImpulse.vx).toBe(3);
    expect(largeImpulse.vy).toBe(4);
    expect(smallImpulse.vx).toBe(2);
    expect(smallImpulse.vy).toBe(1);
  });

  it('preserves zero velocity impulses', () => {
    const node = createNode();

    addCappedNodeVelocity(node, 0, 0, 5);

    expect(node.vx).toBe(0);
    expect(node.vy).toBe(0);
  });

  it('translates finite position and pinned coordinates while preserving invalid coordinates', () => {
    const node = createNode({
      x: 2,
      y: Number.NaN,
      fx: 4,
      fy: undefined,
    });

    translateNodePosition(node, 5, -2);

    expect(node.x).toBe(7);
    expect(node.y).toBeNaN();
    expect(node.fx).toBe(9);
    expect(node.fy).toBeUndefined();
  });

  it('translates finite y and fy coordinates while leaving missing x and fx coordinates alone', () => {
    const node = createNode({
      x: undefined,
      y: 3,
      fx: undefined,
      fy: 5,
    });

    translateNodePosition(node, 5, -2);

    expect(node.x).toBeUndefined();
    expect(node.y).toBe(1);
    expect(node.fx).toBeUndefined();
    expect(node.fy).toBe(3);
  });

  it('does not translate a node while it is being dragged', () => {
    const node = createNode({ x: 2, y: 3, fx: 4, fy: 5, isDragging: true });

    translateNodePosition(node, 5, -2);

    expect(node).toMatchObject({ x: 2, y: 3, fx: 4, fy: 5 });
  });
});

function createNode(overrides: Partial<FGNode> = {}): FGNode {
  return {
    id: 'node-1',
    label: 'Node 1',
    size: 1,
    color: '#ffffff',
    borderColor: '#000000',
    borderWidth: 1,
    baseOpacity: 1,
    isFavorite: false,
    isPinned: false,
    ...overrides,
  } as FGNode;
}
