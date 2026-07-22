import { describe, expect, it } from 'vitest';
import { isEdgeShape, isNodeShape, type ScriptShape } from './model';

const NODE = {
  id: 'shape:a',
  type: 'geo',
  x: 0,
  y: 0,
  props: { w: 120, h: 120 },
  meta: { codegraphyKind: 'node', codegraphyEntityId: 'a' },
} satisfies ScriptShape;

describe('physics shape model', () => {
  it('accepts only complete CodeGraphy node shapes', () => {
    expect(isNodeShape(NODE)).toBe(true);
    expect(isNodeShape({ ...NODE, type: 'note' })).toBe(false);
    expect(isNodeShape({ ...NODE, meta: { ...NODE.meta, codegraphyKind: 'edge' } })).toBe(false);
    expect(isNodeShape({ ...NODE, meta: { ...NODE.meta, codegraphyEntityId: 1 } })).toBe(false);
    expect(isNodeShape({ ...NODE, props: { ...NODE.props, w: '120' } })).toBe(false);
    expect(isNodeShape({ ...NODE, props: { ...NODE.props, h: '120' } })).toBe(false);
  });

  it('accepts only CodeGraphy arrow edges', () => {
    const edge = { ...NODE, type: 'arrow', meta: { codegraphyKind: 'edge' } };

    expect(isEdgeShape(edge)).toBe(true);
    expect(isEdgeShape({ ...edge, type: 'geo' })).toBe(false);
    expect(isEdgeShape({ ...edge, meta: { codegraphyKind: 'node' } })).toBe(false);
  });
});
