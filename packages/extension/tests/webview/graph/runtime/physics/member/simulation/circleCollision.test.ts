import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../../../../src/webview/components/graph/model/build';
import { applyMemberCircleCollision } from '../../../../../../../src/webview/components/graph/runtime/physics/member/simulation/circleCollision';

function node(overrides: Partial<FGNode>): FGNode {
  return {
    baseOpacity: 1,
    borderColor: '#000000',
    borderWidth: 1,
    color: '#60a5fa',
    id: 'node',
    isFavorite: false,
    isPinned: false,
    label: 'node',
    size: 10,
    ...overrides,
  } as FGNode;
}

describe('applyMemberCircleCollision', () => {
  it('separates overlapping movable members along the collision normal', () => {
    const left = node({ id: 'left', x: 0, y: 0 });
    const right = node({ id: 'right', x: 6, y: 8 });

    applyMemberCircleCollision(left, right, 0.5);

    expect(left.x).toBeCloseTo(-5.4);
    expect(left.y).toBeCloseTo(-7.2);
    expect(right.x).toBeCloseTo(11.4);
    expect(right.y).toBeCloseTo(15.2);
    expect(left.vx).toBeCloseTo(-2.7);
    expect(left.vy).toBeCloseTo(-3.6);
    expect(right.vx).toBeCloseTo(2.7);
    expect(right.vy).toBeCloseTo(3.6);
  });

  it('moves only the unpinned member when the other member is fixed', () => {
    const left = node({ id: 'left', isPinned: true, x: 0, y: 0 });
    const right = node({ id: 'right', x: 6, y: 8 });

    applyMemberCircleCollision(left, right, 0.5);

    expect(left.x).toBe(0);
    expect(left.y).toBe(0);
    expect(left.vx).toBe(0);
    expect(left.vy).toBe(0);
    expect(right.x).toBeCloseTo(16.8);
    expect(right.y).toBeCloseTo(22.4);
    expect(right.vx).toBeCloseTo(2.7);
    expect(right.vy).toBeCloseTo(3.6);
  });

  it('leaves fixed members unchanged when neither can move', () => {
    const left = node({ id: 'left', isPinned: true, x: 0, y: 0 });
    const right = node({ id: 'right', isDragging: true, x: 6, y: 8 });

    applyMemberCircleCollision(left, right, 0.5);

    expect(left.x).toBe(0);
    expect(left.y).toBe(0);
    expect(right.x).toBe(6);
    expect(right.y).toBe(8);
    expect(left.vx).toBeUndefined();
    expect(right.vx).toBeUndefined();
  });

  it('leaves separated members unchanged', () => {
    const left = node({ id: 'left', x: 0, y: 0 });
    const right = node({ id: 'right', x: 30, y: 40 });

    applyMemberCircleCollision(left, right, 0.5);

    expect(left.x).toBe(0);
    expect(left.y).toBe(0);
    expect(right.x).toBe(30);
    expect(right.y).toBe(40);
    expect(left.vx).toBeUndefined();
    expect(right.vx).toBeUndefined();
  });

  it('leaves exactly touching members without zero velocity writes', () => {
    const left = node({ id: 'left', x: 0, y: 0 });
    const right = node({ id: 'right', x: 28, y: 0 });

    applyMemberCircleCollision(left, right, 0.5);

    expect(left.x).toBe(0);
    expect(right.x).toBe(28);
    expect(left.vx).toBeUndefined();
    expect(right.vx).toBeUndefined();
  });
});
