import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../../../../src/webview/components/graph/model/build';
import {
  isFiniteTranslate,
  moveNodeByTranslate,
} from '../../../../../../../src/webview/components/graph/runtime/use/interaction/nodeDrag/position';

describe('graph/runtime/use/interaction/nodeDrag/position', () => {
  it('accepts only finite x and y deltas', () => {
    expect(isFiniteTranslate({ x: 1, y: -2 })).toBe(true);
    expect(isFiniteTranslate({ x: Number.NaN, y: -2 })).toBe(false);
    expect(isFiniteTranslate({ x: 1, y: Number.POSITIVE_INFINITY })).toBe(false);
  });

  it('moves a node by the drag delta and pins the live position', () => {
    const node = { id: 'node', x: 10, y: 20, vx: 4, vy: -6 } as FGNode;

    moveNodeByTranslate(node, { x: 3, y: -5 });

    expect(node).toMatchObject({
      fx: 13,
      fy: 15,
      vx: 0,
      vy: 0,
      x: 13,
      y: 15,
    });
  });

  it('uses zero as the drag origin when coordinates are missing or invalid', () => {
    const node = { id: 'node', x: Number.NaN, y: undefined } as FGNode;

    moveNodeByTranslate(node, { x: 3, y: -5 });

    expect(node).toMatchObject({
      fx: 3,
      fy: -5,
      x: 3,
      y: -5,
    });
  });

  it('ignores non-finite drag deltas', () => {
    const node = { id: 'node', x: 10, y: 20 } as FGNode;

    moveNodeByTranslate(node, { x: 3, y: Number.NaN });

    expect(node).toEqual({ id: 'node', x: 10, y: 20 });
  });
});
