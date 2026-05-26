import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  addAxisVelocity,
  addBoundedAxisVelocity,
} from '../../../../../../src/webview/components/graph/runtime/physics/axisMotion';

describe('webview/components/graph/runtime/physics/axisMotion', () => {
  it('adds x-axis velocity without changing y-axis velocity', () => {
    const node = createNode({ vx: 2, vy: 5 });

    addAxisVelocity(node, 'x', 3);

    expect(node.vx).toBe(5);
    expect(node.vy).toBe(5);
  });

  it('adds y-axis velocity from zero when the node has no existing y velocity', () => {
    const node = createNode({ vx: 2 });

    addAxisVelocity(node, 'y', 4);

    expect(node.vx).toBe(2);
    expect(node.vy).toBe(4);
  });

  it('caps bounded axis velocity to the maximum impulse', () => {
    const node = createNode();

    addBoundedAxisVelocity(node, 'x', 12, 5);
    addBoundedAxisVelocity(node, 'y', -12, 5);

    expect(node.vx).toBe(5);
    expect(node.vy).toBe(-5);
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
