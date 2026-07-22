import { describe, expect, it } from 'vitest';
import { graphStructureKey } from './structure';

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

    expect(graphStructureKey([note, edge, node])).toBe(
      'edge:shape:edge:a:b|node:a:120:80',
    );
    expect(graphStructureKey([node, edge])).toBe(graphStructureKey([edge, node]));
    expect(graphStructureKey([note])).toBe('');
  });
});
