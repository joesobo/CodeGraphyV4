import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { describe, expect, it } from 'vitest';
import { createShapeUpdates } from './model';

describe('tldraw physics shape updates', () => {
  it('projects normalized node positions and resolved edge geometry onto native shapes', () => {
    const nodes = [
      {
        id: 'shape:a', type: 'geo', x: 0, y: 0, props: { w: 120, h: 120 },
        meta: { codegraphyKind: 'node' as const, codegraphyEntityId: 'a' },
      },
      {
        id: 'shape:b', type: 'geo', x: 0, y: 0, props: { w: 120, h: 120 },
        meta: { codegraphyKind: 'node' as const, codegraphyEntityId: 'b' },
      },
    ];
    const edges = [
      { id: 'edge:ab', type: 'arrow', x: 0, y: 0, props: { dash: 'solid' }, meta: { codegraphyFrom: 'a', codegraphyTo: 'b' } },
      { id: 'edge:missing', type: 'arrow', x: 0, y: 0, props: {}, meta: { codegraphyFrom: 'a', codegraphyTo: 'missing' } },
    ];
    const engine = {
      nodeIds: ['a', 'b'],
      x: Float32Array.of(10, 90),
      y: Float32Array.of(20, 100),
    } as unknown as GraphLayoutEngine;

    expect(createShapeUpdates(nodes, edges, engine)).toEqual([
      { id: 'shape:a', type: 'geo', x: -30, y: 0 },
      { id: 'shape:b', type: 'geo', x: 210, y: 240 },
      {
        id: 'edge:ab', type: 'arrow', x: 30, y: 60,
        props: { dash: 'solid', start: { x: 0, y: 0 }, end: { x: 240, y: 240 } },
      },
    ]);
  });
});
