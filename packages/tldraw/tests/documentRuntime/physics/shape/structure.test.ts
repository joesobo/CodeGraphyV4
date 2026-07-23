import { describe, expect, it } from 'vitest';
import { graphStructureKey } from '../../../../src/documentRuntime/physics/shape/structure';

describe('physics graph structure key', () => {
  it('tracks node dimensions and edge endpoints while ignoring user shapes and order', () => {
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

    expect(graphStructureKey([note, edge, icon, label, node])).toBe(
      'edge:shape:edge:a:b|icon:shape:icon:a:56:56|label:shape:label:a:180|node:a:120:80',
    );
    expect(graphStructureKey([node, edge])).toBe(graphStructureKey([edge, node]));
    expect(graphStructureKey([note])).toBe('');
  });
});
