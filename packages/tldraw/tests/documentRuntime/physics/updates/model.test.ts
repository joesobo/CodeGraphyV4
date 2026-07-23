import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { describe, expect, it } from 'vitest';
import {
  createShapeUpdateModel,
  createShapeUpdates,
} from '../../../../src/documentRuntime/physics/updates/model';

describe('tldraw physics shape updates', () => {
  it('moves node companions into the same native frame coordinate space', () => {
    const node = {
      id: 'shape:a',
      parentId: 'shape:frame',
      type: 'geo',
      x: 0,
      y: 0,
      props: { h: 120, w: 120 },
      meta: { codegraphyKind: 'node' as const, codegraphyEntityId: 'a' },
    };
    const icon = {
      id: 'icon:a',
      parentId: 'page:page',
      type: 'image',
      x: 0,
      y: 0,
      props: { h: 56, w: 56 },
      meta: { codegraphyKind: 'icon' as const, codegraphyNodeId: 'a' },
    };
    const label = {
      id: 'label:a',
      parentId: 'page:page',
      type: 'text',
      x: 0,
      y: 0,
      props: { w: 180 },
      meta: { codegraphyKind: 'label' as const, codegraphyNodeId: 'a' },
    };
    const engine = {
      nodeIds: ['a'],
      x: Float32Array.of(100),
      y: Float32Array.of(80),
    } as unknown as GraphLayoutEngine;
    const geometryHost = {
      getPointInParentSpace: (
        shape: typeof node | typeof icon | typeof label,
        point: { x: number; y: number },
      ) => shape.parentId === 'shape:frame'
        ? { x: point.x - 400, y: point.y - 200 }
        : point,
      getShapePageBounds: () => ({ h: 120, w: 120, x: 400, y: 200 }),
    };
    const model = createShapeUpdateModel(
      [node],
      [],
      [icon],
      [label],
      engine,
      geometryHost,
    );

    expect(createShapeUpdates(model, engine)).toEqual([
      { id: 'shape:a', type: 'geo', x: 40, y: 140 },
      {
        id: 'icon:a',
        parentId: 'shape:frame',
        type: 'image',
        x: 72,
        y: 172,
      },
      {
        id: 'label:a',
        parentId: 'shape:frame',
        type: 'text',
        x: 10,
        y: 268,
      },
    ]);
  });

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

    const model = createShapeUpdateModel(nodes, edges, icons, labels, engine);

    expect(createShapeUpdates(model, engine)).toEqual([
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

  it('updates only visibly moved nodes and their dependent shapes', () => {
    const nodes = [
      {
        id: 'shape:a', type: 'geo', x: 0, y: 0, props: { w: 120, h: 120 },
        meta: { codegraphyKind: 'node' as const, codegraphyEntityId: 'a' },
      },
      {
        id: 'shape:b', type: 'geo', x: 200, y: 0, props: { w: 120, h: 120 },
        meta: { codegraphyKind: 'node' as const, codegraphyEntityId: 'b' },
      },
    ];
    const edges = [{
      id: 'edge:ab', type: 'arrow', x: 60, y: 60, props: {},
      meta: { codegraphyFrom: 'a', codegraphyTo: 'b' },
    }];
    const icons = [{
      id: 'icon:a', type: 'image', x: 32, y: 32, props: { w: 56, h: 56 },
      meta: { codegraphyKind: 'icon' as const, codegraphyNodeId: 'a' },
    }];
    const labels = [{
      id: 'label:a', type: 'text', x: -30, y: 128, props: { w: 180 },
      meta: { codegraphyKind: 'label' as const, codegraphyNodeId: 'a' },
    }];
    const engine = {
      nodeIds: ['a', 'b'],
      x: Float32Array.of(12, 52),
      y: Float32Array.of(12, 12),
    } as unknown as GraphLayoutEngine;
    const model = createShapeUpdateModel(nodes, edges, icons, labels, engine);

    expect(createShapeUpdates(model, engine)).toEqual([]);

    engine.x[0] += 0.04;
    expect(createShapeUpdates(model, engine)).toEqual([]);

    engine.x[0] += 0.02;
    expect(createShapeUpdates(model, engine).map(update => update.id)).toEqual([
      'shape:a',
      'edge:ab',
      'icon:a',
      'label:a',
    ]);
  });
});
