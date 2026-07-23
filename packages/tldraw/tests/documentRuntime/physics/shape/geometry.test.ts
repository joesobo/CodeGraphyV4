import { describe, expect, it, vi } from 'vitest';
import {
  shapeLocalPoint,
  shapePageBounds,
} from '../../../../src/documentRuntime/physics/shape/geometry';
import type { ScriptShape } from '../../../../src/documentRuntime/physics/shape/model';

const node = {
  id: 'shape:node',
  meta: {},
  props: { h: 80, w: 120 },
  type: 'geo',
  x: 10,
  y: 20,
} satisfies ScriptShape;

describe('tldraw physics shape geometry', () => {
  it('uses page geometry for parented shapes and local geometry as its fallback', () => {
    const host = {
      getPointInParentSpace: vi.fn(() => ({ x: 25, y: 35 })),
      getShapePageBounds: vi.fn(() => ({ h: 80, w: 120, x: 410, y: 220 })),
    };

    expect(shapePageBounds(node, host)).toEqual({ h: 80, w: 120, x: 410, y: 220 });
    expect(shapeLocalPoint(node, { x: 500, y: 300 }, host)).toEqual({ x: 25, y: 35 });
    expect(shapePageBounds(node)).toEqual({ h: 80, w: 120, x: 10, y: 20 });
    expect(shapeLocalPoint(node, { x: 500, y: 300 })).toEqual({ x: 500, y: 300 });
  });
});
