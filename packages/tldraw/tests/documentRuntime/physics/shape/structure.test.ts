import { describe, expect, it } from 'vitest';
import { graphStructureKey } from '../../../../src/documentRuntime/physics/shape/structure';

describe('physics graph structure key', () => {
  it('tracks frames, node parents, dimensions, and edge endpoints while ignoring other user shapes', () => {
    const node = {
      id: 'shape:a', type: 'geo', x: 0, y: 0, props: { w: 120, h: 80 },
      meta: { codegraphyKind: 'node', codegraphyEntityId: 'a' },
    };
    const edge = {
      id: 'shape:edge', type: 'arrow', x: 0, y: 0, props: {},
      meta: { codegraphyKind: 'edge', codegraphyFrom: 'a', codegraphyTo: 'b' },
    };
    const note = { id: 'shape:note', type: 'note', x: 0, y: 0, props: {}, meta: {} };
    const label = {
      id: 'shape:label', type: 'text', x: 0, y: 0, props: { w: 180 },
      meta: { codegraphyKind: 'label', codegraphyNodeId: 'a' },
    };
    const icon = {
      id: 'shape:icon', type: 'image', x: 0, y: 0, props: { w: 56, h: 56 },
      meta: { codegraphyKind: 'icon', codegraphyNodeId: 'a' },
    };
    const frame = {
      id: 'shape:frame',
      type: 'frame',
      x: 400,
      y: 200,
      props: { h: 400, w: 600 },
      meta: {},
    };
    const framedNode = { ...node, parentId: frame.id };

    expect(graphStructureKey([note, edge, icon, label, node])).toBe(
      'edge:shape:edge:a:b|icon:shape:icon:a:56:56|label:shape:label:a:180|node:a::120:80',
    );
    expect(graphStructureKey([node, edge])).toBe(graphStructureKey([edge, node]));
    expect(graphStructureKey([frame, framedNode])).toBe(
      'frame:shape:frame::400:200:0:600:400|node:a:shape:frame:120:80',
    );
    expect(graphStructureKey([{ ...frame, x: 500 }, framedNode]))
      .not.toBe(graphStructureKey([frame, framedNode]));
    expect(graphStructureKey([{ ...frame, rotation: Math.PI / 2 }, framedNode]))
      .not.toBe(graphStructureKey([frame, framedNode]));
    expect(graphStructureKey([note])).toBe('');
  });
});
