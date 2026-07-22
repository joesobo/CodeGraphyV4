import { beforeEach, describe, expect, it, vi } from 'vitest';

const engine = { nodeIds: ['a', 'b'] };
const createGraphLayoutEngine = vi.fn(() => engine);

vi.mock('@codegraphy-dev/graph-renderer', () => ({ createGraphLayoutEngine }));

describe('tldraw physics engine input', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns no engine for an empty graph', async () => {
    const { createRuntimeEngine } = await import('./model');

    expect(createRuntimeEngine([], [], {
      repelForce: 10, centerForce: 0.1, linkDistance: 80, linkForce: 1,
    })).toBeUndefined();
    expect(createGraphLayoutEngine).not.toHaveBeenCalled();
  });

  it('builds normalized nodes and only resolved edge endpoints', async () => {
    const nodes = [
      {
        id: 'shape:a', type: 'geo', x: 0, y: 0, props: { w: 120, h: 120 },
        meta: { codegraphyKind: 'node' as const, codegraphyEntityId: 'a' },
      },
      {
        id: 'shape:b', type: 'geo', x: 240, y: 120, props: { w: 120, h: 60 },
        meta: { codegraphyKind: 'node' as const, codegraphyEntityId: 'b' },
      },
    ];
    const edges = [
      { id: 'edge:ba', type: 'arrow', x: 0, y: 0, props: {}, meta: { codegraphyFrom: 'b', codegraphyTo: 'a' } },
      { id: 'edge:missing-target', type: 'arrow', x: 0, y: 0, props: {}, meta: { codegraphyFrom: 'a', codegraphyTo: 'missing' } },
      { id: 'edge:missing-source', type: 'arrow', x: 0, y: 0, props: {}, meta: { codegraphyFrom: 'missing', codegraphyTo: 'b' } },
    ];
    const { createRuntimeEngine } = await import('./model');

    expect(createRuntimeEngine(nodes, edges, {
      repelForce: 10, centerForce: 0.1, linkDistance: 80, linkForce: 1,
    })).toBe(engine);
    expect(createGraphLayoutEngine).toHaveBeenCalledWith(expect.objectContaining({
      nodeIds: ['a', 'b'],
      initialX: Float32Array.of(20, 100),
      initialY: Float32Array.of(20, 50),
      radii: Float32Array.of(20, 20),
      edgeSources: Uint32Array.of(1),
      edgeTargets: Uint32Array.of(0),
    }), expect.objectContaining({ centralGravity: 0.1, collisionPadding: 8 / 3 }));
  });
});
