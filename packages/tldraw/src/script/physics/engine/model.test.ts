import type { GraphLayoutConfig, GraphLayoutInput } from '@codegraphy-dev/graph-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const engine = { nodeIds: ['a', 'b'] };
const createGraphLayoutEngine = vi.fn((
  _input: GraphLayoutInput,
  _config: Partial<GraphLayoutConfig>,
) => engine);

vi.mock('@codegraphy-dev/graph-renderer', () => ({
  createGraphLayoutEngine,
  graphNodeSizeChargeMultiplier: (size: number, defaultSize: number) => size / defaultSize,
}));

describe('tldraw physics engine input', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns no engine for an empty graph', async () => {
    const { createRuntimeEngine } = await import('./model');

    expect(createRuntimeEngine([], [], {
      repelForce: 10, centerForce: 0.1, linkDistance: 80, linkForce: 1,
    })).toBeUndefined();
    expect(createGraphLayoutEngine).not.toHaveBeenCalled();
  });

  it('builds normalized nodes, resized collision radii, and only resolved edge endpoints', async () => {
    const nodes = [
      {
        id: 'shape:a', type: 'geo', x: 0, y: 0, props: { w: 120, h: 120 },
        meta: { codegraphyKind: 'node' as const, codegraphyEntityId: 'a' },
      },
      {
        id: 'shape:b', type: 'geo', x: 240, y: 120, props: { w: 240, h: 60 },
        meta: { codegraphyKind: 'node' as const, codegraphyEntityId: 'b' },
      },
    ];
    const edges = [
      { id: 'edge:ab', type: 'arrow', x: 0, y: 0, props: {}, meta: { codegraphyFrom: 'a', codegraphyTo: 'b' } },
      { id: 'edge:missing-target', type: 'arrow', x: 0, y: 0, props: {}, meta: { codegraphyFrom: 'a', codegraphyTo: 'missing' } },
      { id: 'edge:missing-source', type: 'arrow', x: 0, y: 0, props: {}, meta: { codegraphyFrom: 'missing', codegraphyTo: 'b' } },
    ];
    const { createRuntimeEngine } = await import('./model');

    expect(createRuntimeEngine(nodes, edges, {
      repelForce: 10, centerForce: 0.1, linkDistance: 80, linkForce: 1,
    })).toBe(engine);
    expect(createGraphLayoutEngine.mock.calls[0]?.[0]).toMatchObject({
      nodeIds: ['a', 'b'],
      initialX: Float32Array.of(12, 72),
      initialY: Float32Array.of(12, 30),
      chargeStrengthMultipliers: Float32Array.of(0.5, 1),
      radii: Float32Array.of(12, 24),
      edgeSources: Uint32Array.of(0),
      edgeTargets: Uint32Array.of(1),
    });
    expect(createGraphLayoutEngine.mock.calls[0]?.[1].collisionPadding).toBeUndefined();
  });

  it('keeps connection-based spacing as the minimum for dense nodes', async () => {
    const nodes = Array.from({ length: 9 }, (_, index) => ({
      id: `shape:${index}`,
      type: 'geo',
      x: index * 20,
      y: 0,
      props: { w: 20, h: 20 },
      meta: { codegraphyKind: 'node' as const, codegraphyEntityId: String(index) },
    }));
    const edges = Array.from({ length: 8 }, (_, index) => ({
      id: `edge:${index + 1}`,
      type: 'arrow',
      x: 0,
      y: 0,
      props: {},
      meta: { codegraphyFrom: '0', codegraphyTo: String(index + 1) },
    }));
    const { createRuntimeEngine } = await import('./model');

    createRuntimeEngine(nodes, edges, {
      repelForce: 10, centerForce: 0.1, linkDistance: 80, linkForce: 1,
    });

    const input = createGraphLayoutEngine.mock.calls[0]?.[0];
    if (!input) throw new Error('Expected graph layout input');
    expect(input.radii).toEqual(Float32Array.of(13, 12, 12, 12, 12, 12, 12, 12, 12));
    expect(input.chargeStrengthMultipliers?.[0]).toBeCloseTo(9 / 16);
  });
});
