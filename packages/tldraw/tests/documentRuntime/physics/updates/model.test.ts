import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { describe, expect, it } from 'vitest';
import { createShapeUpdates } from '../../../../src/documentRuntime/physics/updates/model';

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
    const labels = [
      {
        id: 'label:a', type: 'text', x: 0, y: 0, props: { w: 180 },
        meta: { codegraphyKind: 'label' as const, codegraphyNodeId: 'a' },
      },
      {
        id: 'label:missing', type: 'text', x: 0, y: 0, props: { w: 180 },
        meta: { codegraphyKind: 'label' as const, codegraphyNodeId: 'missing' },
      },
    ];
    const icons = [
      {
        id: 'icon:a', type: 'image', x: 0, y: 0, props: { w: 56, h: 56 },
        meta: { codegraphyKind: 'icon' as const, codegraphyNodeId: 'a' },
      },
      {
        id: 'icon:missing', type: 'image', x: 0, y: 0, props: { w: 56, h: 56 },
        meta: { codegraphyKind: 'icon' as const, codegraphyNodeId: 'missing' },
      },
    ];
    const engine = {
      nodeIds: ['a', 'b'],
      x: Float32Array.of(10, 90),
      y: Float32Array.of(20, 100),
    } as unknown as GraphLayoutEngine;

    expect(createShapeUpdates(nodes, edges, icons, labels, engine)).toEqual([
      { id: 'shape:a', type: 'geo', x: -10, y: 40 },
      { id: 'shape:b', type: 'geo', x: 390, y: 440 },
      {
        id: 'edge:ab', type: 'arrow', x: 50, y: 100,
        props: { dash: 'solid', start: { x: 0, y: 0 }, end: { x: 400, y: 400 } },
      },
      { id: 'icon:a', type: 'image', x: 22, y: 72 },
      { id: 'label:a', type: 'text', x: -40, y: 168 },
    ]);
  });
});
