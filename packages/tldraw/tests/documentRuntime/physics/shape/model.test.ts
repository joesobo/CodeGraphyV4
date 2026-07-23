import { describe, expect, it } from 'vitest';
import {
  isEdgeShape,
  isFrameShape,
  isIconShape,
  isLabelShape,
  isNodeShape,
  type ScriptShape,
} from '../../../../src/documentRuntime/physics/shape/model';

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

  it('accepts native frames with numeric dimensions', () => {
    const frame = { ...NODE, type: 'frame', meta: {} };

    expect(isFrameShape(frame)).toBe(true);
    expect(isFrameShape({ ...frame, props: { ...frame.props, w: '120' } })).toBe(false);
    expect(isFrameShape({ ...frame, type: 'geo' })).toBe(false);
  });

  it('accepts only CodeGraphy arrow edges', () => {
    const edge = { ...NODE, type: 'arrow', meta: { codegraphyKind: 'edge' } };

    expect(isEdgeShape(edge)).toBe(true);
    expect(isEdgeShape({ ...edge, type: 'geo' })).toBe(false);
    expect(isEdgeShape({ ...edge, meta: { codegraphyKind: 'node' } })).toBe(false);
  });

  it('accepts generated text labels with a node owner', () => {
    const label = {
      ...NODE,
      type: 'text',
      props: { w: 180 },
      meta: { codegraphyKind: 'label', codegraphyNodeId: 'a' },
    };

    expect(isLabelShape(label)).toBe(true);
    expect(isLabelShape({ ...label, meta: { codegraphyKind: 'label' } })).toBe(false);
    expect(isLabelShape({ ...label, type: 'geo' })).toBe(false);
  });

  it('accepts generated image icons with a node owner', () => {
    const icon = {
      ...NODE,
      type: 'image',
      props: { w: 56, h: 56 },
      meta: { codegraphyKind: 'icon', codegraphyNodeId: 'a' },
    };

    expect(isIconShape(icon)).toBe(true);
    expect(isIconShape({ ...icon, meta: { codegraphyKind: 'icon' } })).toBe(false);
    expect(isIconShape({ ...icon, type: 'geo' })).toBe(false);
  });
});
