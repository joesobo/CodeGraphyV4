import { describe, expect, it } from 'vitest';
import type { IPhysicsSettings } from '../../../../../../src/shared/settings/physics';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  createOwnedGraphLayout,
  ownedNodeCollisionRadius,
  toOwnedPhysicsConfig,
  updateOwnedGraphLayout,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import {
  createGraphLayoutEngine,
  GraphNodeFlag,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';

const DEFAULT_SETTINGS: IPhysicsSettings = {
  centerForce: 0.1,
  damping: 0.7,
  linkDistance: 80,
  linkForce: 0.15,
  repelForce: 10,
};

function node(id: string, overrides: Partial<FGNode> = {}): FGNode {
  return {
    id,
    label: id,
    size: 4,
    color: '#ffffff',
    borderColor: '#000000',
    borderWidth: 1,
    baseOpacity: 1,
    isFavorite: false,
    isPinned: false,
    ...overrides,
  };
}

function twoNodeEngine(initialDistance: number) {
  return createGraphLayoutEngine({
    nodeIds: ['a', 'b'],
    initialX: Float32Array.of(-initialDistance / 2, initialDistance / 2),
    initialY: Float32Array.of(0, 0),
    radii: Float32Array.of(1, 1),
    edgeSources: Uint32Array.of(0),
    edgeTargets: Uint32Array.of(1),
  });
}

function run(engine: ReturnType<typeof createGraphLayoutEngine>, ticks = 240): void {
  for (let index = 0; index < ticks; index += 1) engine.tick(1000 / 60);
}

describe('owned graph layout settings', () => {
  it('maps every force slider range and preserves legacy D3 damping semantics', () => {
    expect(toOwnedPhysicsConfig({
      centerForce: 1,
      damping: 0.7,
      linkDistance: 500,
      linkForce: 1,
      repelForce: 20,
    })).toEqual({
      centerForce: 1,
      damping: 0.30000000000000004,
      linkDistance: 500,
      linkForce: 1,
      repelForce: 2400,
    });

    expect(toOwnedPhysicsConfig({
      centerForce: Number.POSITIVE_INFINITY,
      damping: -1,
      linkDistance: 1,
      linkForce: 2,
      repelForce: Number.NaN,
    })).toEqual({
      centerForce: 0.1,
      damping: 1,
      linkDistance: 30,
      linkForce: 1,
      repelForce: 1200,
    });
  });

  it('makes link distance and link force materially affect spring convergence', () => {
    const short = twoNodeEngine(300);
    short.setConfig(toOwnedPhysicsConfig({ ...DEFAULT_SETTINGS, centerForce: 0, repelForce: 0, linkDistance: 30, linkForce: 1 }));
    run(short);

    const long = twoNodeEngine(300);
    long.setConfig(toOwnedPhysicsConfig({ ...DEFAULT_SETTINGS, centerForce: 0, repelForce: 0, linkDistance: 500, linkForce: 1 }));
    run(long);

    const disabled = twoNodeEngine(300);
    disabled.setConfig(toOwnedPhysicsConfig({ ...DEFAULT_SETTINGS, centerForce: 0, repelForce: 0, linkDistance: 30, linkForce: 0 }));
    run(disabled, 60);

    const strong = twoNodeEngine(300);
    strong.setConfig(toOwnedPhysicsConfig({ ...DEFAULT_SETTINGS, centerForce: 0, repelForce: 0, linkDistance: 30, linkForce: 1 }));
    run(strong, 60);

    const distance = (engine: ReturnType<typeof createGraphLayoutEngine>) => Math.abs(engine.x[1] - engine.x[0]);
    expect(distance(short)).toBeLessThan(distance(long));
    expect(Math.abs(distance(strong) - 30)).toBeLessThan(Math.abs(distance(disabled) - 30));
  });

  it('makes repel and center sliders materially affect node spacing', () => {
    const makeDisconnected = (repelForce: number, centerForce: number) => {
      const engine = createGraphLayoutEngine({
        nodeIds: ['a', 'b'],
        initialX: Float32Array.of(-10, 10),
        initialY: Float32Array.of(0, 0),
        radii: Float32Array.of(1, 1),
        edgeSources: new Uint32Array(),
        edgeTargets: new Uint32Array(),
      });
      engine.setConfig(toOwnedPhysicsConfig({ ...DEFAULT_SETTINGS, repelForce, centerForce }));
      run(engine, 120);
      return engine;
    };

    const noRepel = makeDisconnected(0, 0);
    const maximumRepel = makeDisconnected(20, 0);
    const noCenter = makeDisconnected(0, 0);
    const maximumCenter = makeDisconnected(0, 1);
    const radialDistance = (engine: ReturnType<typeof createGraphLayoutEngine>) => Math.abs(engine.x[0]) + Math.abs(engine.x[1]);

    expect(radialDistance(maximumRepel)).toBeGreaterThan(radialDistance(noRepel));
    expect(radialDistance(maximumCenter)).toBeLessThan(radialDistance(noCenter));
  });
});

describe('owned graph dynamic updates', () => {
  it('patches metadata without rebuilding physics and preserves state across topology changes', () => {
    const initialNodes = [
      node('a', { x: 10, y: 20, vx: 1, vy: 2 }),
      node('b', { x: 30, y: 40, vx: 3, vy: 4 }),
    ];
    const initialLinks = [{
      id: 'a-b',
      from: 'a',
      to: 'b',
      source: initialNodes[0],
      target: initialNodes[1],
      bidirectional: false,
    }];
    const layout = createOwnedGraphLayout(initialNodes, initialLinks, DEFAULT_SETTINGS);
    const engine = layout.engine;
    engine.setKinematics(
      Float32Array.of(100, 300),
      Float32Array.of(200, 400),
      Float32Array.of(5, 7),
      Float32Array.of(6, 8),
    );

    const recolored = [node('a', { color: '#ff0000' }), node('b')];
    expect(updateOwnedGraphLayout(layout, recolored, [{
      ...initialLinks[0],
      source: recolored[0],
      target: recolored[1],
    }], DEFAULT_SETTINGS)).toBe(true);
    expect(layout.engine).toBe(engine);
    expect(layout.nodes[0].color).toBe('#ff0000');
    expect(Array.from(layout.engine.x)).toEqual([100, 300]);

    const added = [...recolored, node('c', { x: 500, y: 600 })];
    expect(updateOwnedGraphLayout(layout, added, [{
      ...initialLinks[0],
      source: added[0],
      target: added[1],
    }, {
      id: 'b-c',
      from: 'b',
      to: 'c',
      source: added[1],
      target: added[2],
      bidirectional: false,
    }], DEFAULT_SETTINGS)).toBe(true);
    expect(layout.engine).toBe(engine);
    expect(Array.from(layout.engine.x)).toEqual([100, 300, 500]);
    expect(Array.from(layout.engine.y)).toEqual([200, 400, 600]);
    expect(Array.from(layout.engine.vx)).toEqual([5, 7, 0]);
    expect(Array.from(layout.engine.vy)).toEqual([6, 8, 0]);
  });
});

describe('owned graph node physics state', () => {
  it('uses shape bounds for collisions and restores pinned positions and velocity', () => {
    expect(ownedNodeCollisionRadius(node('rectangle', {
      shapeSize2D: { width: 6, height: 8 },
    }))).toBe(5);

    const layout = createOwnedGraphLayout([
      node('pinned', { fx: 20, fy: 30, isPinned: true }),
      node('moving', { x: 40, y: 50, vx: 2, vy: -3 }),
    ], [], DEFAULT_SETTINGS);

    expect(layout.engine.x[0]).toBe(20);
    expect(layout.engine.y[0]).toBe(30);
    expect(layout.engine.flags[0] & GraphNodeFlag.Pinned).toBe(GraphNodeFlag.Pinned);
    expect(layout.engine.vx[1]).toBe(2);
    expect(layout.engine.vy[1]).toBe(-3);
  });
});
