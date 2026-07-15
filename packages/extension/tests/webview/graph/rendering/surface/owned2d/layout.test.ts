import { describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../../../src/shared/settings/physics';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import { ownedNodeCollisionRadius } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/collisionRadius';
import {
  createOwnedGraphLayout,
  toOwnedPhysicsConfig,
  updateOwnedGraphLayout,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import {
  releaseOwnedDraggedNodes,
  synchronizeOwnedDraggedNodes,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/drag';
import {
  createGraphLayoutEngine,
  GraphNodeFlag,
} from '@codegraphy-dev/graph-renderer';
import { TypedGraphLayoutEngine } from '@codegraphy-dev/graph-renderer';

const DEFAULT_SETTINGS: IPhysicsSettings = {
  centerForce: 0.1,
  damping: 0.4,
  linkDistance: 80,
  linkForce: 1,
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
  for (let index = 0; index < ticks; index += 1) engine.tick();
}

describe('owned graph layout settings', () => {
  it('uses the synchronous typed engine as its sole physics home', () => {
    const layout = createOwnedGraphLayout([node('a')], [], DEFAULT_SETTINGS);

    expect(layout.engine).toBeInstanceOf(TypedGraphLayoutEngine);
  });

  it('maps every existing force setting to its semantic engine value', () => {
    expect(toOwnedPhysicsConfig({
      centerForce: 1,
      damping: 0.4,
      linkDistance: 500,
      linkForce: 1,
      repelForce: 20,
    })).toEqual({
      centralGravity: 1,
      chargeStrength: -500,
      linkDistance: 500,
      linkStrength: 1,
      velocityDecay: 0.4,
    });

    expect(toOwnedPhysicsConfig({
      centerForce: Number.POSITIVE_INFINITY,
      damping: -1,
      linkDistance: 1,
      linkForce: 2,
      repelForce: Number.NaN,
    })).toEqual({
      centralGravity: 0.1,
      chargeStrength: -250,
      linkDistance: 30,
      linkStrength: 2,
      velocityDecay: 0,
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
    updateOwnedGraphLayout(layout, recolored, [{
      ...initialLinks[0],
      source: recolored[0],
      target: recolored[1],
    }], DEFAULT_SETTINGS);
    expect(layout.engine).toBe(engine);
    expect(layout.nodes[0].color).toBe('#ff0000');
    expect(Array.from(layout.engine.x)).toEqual([100, 300]);

    const added = [...recolored, node('c', { x: 500, y: 600 })];
    updateOwnedGraphLayout(layout, added, [{
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
    }], DEFAULT_SETTINGS);
    expect(layout.engine).toBe(engine);
    expect(Array.from(layout.engine.x)).toEqual([100, 300, 500]);
    expect(Array.from(layout.engine.y)).toEqual([200, 400, 600]);
    expect(Array.from(layout.engine.vx)).toEqual([5, 7, 0]);
    expect(Array.from(layout.engine.vy)).toEqual([6, 8, 0]);
  });
});

describe('owned graph group dragging', () => {
  it('preserves temporary drag pins across graph data updates', () => {
    const dragged = node('dragged', { x: 10, y: 20, isDragging: true });
    const layout = createOwnedGraphLayout([dragged], [], DEFAULT_SETTINGS);
    layout.engine.pin(0);
    layout.engine.setNodePosition(0, 100, 200);

    const replacement = node('dragged', { color: '#f00' });
    updateOwnedGraphLayout(layout, [replacement], [], DEFAULT_SETTINGS);

    expect(layout.nodes[0].isDragging).toBe(true);
    expect(layout.engine.flags[0] & GraphNodeFlag.Pinned).toBe(GraphNodeFlag.Pinned);
    expect(layout.engine.x[0]).toBe(100);
    expect(layout.engine.y[0]).toBe(200);
  });

  it('moves every selected drag participant through typed physics and releases only temporary pins', () => {
    const nodes = [
      node('primary', { x: 10, y: 20, isDragging: true }),
      node('selected', { x: 30, y: 40, isDragging: true }),
      node('permanent', { x: 50, y: 60, isDragging: true, isPinned: true }),
    ];
    const layout = createOwnedGraphLayout(nodes, [], DEFAULT_SETTINGS);
    const pin = vi.spyOn(layout.engine, 'pin');
    nodes[0].x = 110;
    nodes[0].y = 120;
    nodes[1].x = 130;
    nodes[1].y = 140;
    nodes[2].x = 150;
    nodes[2].y = 160;
    const draggedIndexes = new Set<number>();

    synchronizeOwnedDraggedNodes(layout, draggedIndexes);
    expect(Array.from(draggedIndexes)).toEqual([0, 1, 2]);
    expect(Array.from(layout.engine.x)).toEqual([110, 130, 150]);
    expect(Array.from(layout.engine.y)).toEqual([120, 140, 160]);
    expect(Array.from(layout.engine.flags)).toEqual([
      GraphNodeFlag.Pinned,
      GraphNodeFlag.Pinned,
      GraphNodeFlag.Pinned,
    ]);
    expect(pin).toHaveBeenCalledTimes(3);

    synchronizeOwnedDraggedNodes(layout, draggedIndexes);
    expect(pin).toHaveBeenCalledTimes(3);

    releaseOwnedDraggedNodes(layout, draggedIndexes);
    expect(Array.from(layout.engine.flags)).toEqual([0, 0, GraphNodeFlag.Pinned]);
  });
});

describe('owned graph node physics state', () => {
  it('uses shape bounds for collisions and restores pinned positions and velocity', () => {
    expect(ownedNodeCollisionRadius(node('rectangle', {
      shapeSize2D: { width: 6, height: 8 },
    }))).toBe(9);

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
