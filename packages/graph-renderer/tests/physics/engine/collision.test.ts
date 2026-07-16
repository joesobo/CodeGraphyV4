import { describe, expect, it } from 'vitest';

import { createGraphLayoutEngine, GraphNodeFlag } from '@graph-renderer/physics';

describe('graph layout engine', () => {
  it('keeps coincident nodes finite with bounded energy', () => {
    const nodeCount = 100;
    const engine = createGraphLayoutEngine({
      nodeIds: Array.from({ length: nodeCount }, (_, index) => `node-${index}`),
      initialX: new Float32Array(nodeCount),
      initialY: new Float32Array(nodeCount),
      radii: new Float32Array(nodeCount).fill(5),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });

    for (let tick = 0; tick < 600; tick += 1) engine.tick();

    const values = [...engine.x, ...engine.y, ...engine.vx, ...engine.vy];
    const energy = engine.vx.reduce(
      (sum, velocity, index) => sum + velocity ** 2 + engine.vy[index] ** 2,
      0,
    );
    expect(values.every(Number.isFinite)).toBe(true);
    expect(energy).toBeLessThan(1_000_000);
    expect(new Set(engine.x).size).toBeGreaterThan(1);
  });

  it('projects overlaps out of the layout before publishing a frame', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['first', 'second'],
      initialX: new Float32Array([0, 1]),
      initialY: new Float32Array([0, 0]),
      radii: new Float32Array([10, 10]),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      centralGravity: 0,
      collisionIterations: 3,
      collisionPadding: 2,
      collisionStrength: 1,
      chargeStrength: 0,
    });

    engine.tick();

    expect(Math.hypot(engine.x[1] - engine.x[0], engine.y[1] - engine.y[0]))
      .toBeGreaterThanOrEqual(21.99);
  });

  it('moves a small node around a large node using radius-squared collision shares', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['leaf', 'hub'],
      initialX: Float32Array.of(0, 1),
      initialY: Float32Array.of(0, 0),
      radii: Float32Array.of(8, 30),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      alphaDecay: 1,
      centralGravity: 0,
      chargeStrength: 0,
      collisionIterations: 1,
      collisionPadding: 0,
      collisionStrength: 1,
      settleSteps: 1,
    });

    engine.tick();

    expect(engine.x[0]).toBeCloseTo(-34.54357, 4);
    expect(engine.x[1]).toBeCloseTo(3.45643, 4);
  });

  it('keeps a dragged node fixed while pushing an overlapping neighbor away', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['dragged', 'neighbor'],
      initialX: Float32Array.of(-100, 0),
      initialY: Float32Array.of(0, 0),
      radii: Float32Array.of(8, 30),
      flags: Uint8Array.of(GraphNodeFlag.Pinned, 0),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      alphaDecay: 1,
      centralGravity: 0,
      chargeStrength: 0,
      collisionIterations: 1,
      collisionPadding: 0,
      collisionStrength: 1,
      settleSteps: 1,
    });

    engine.setNodePosition(0, 1, 0);
    engine.tick();

    expect(engine.x[0]).toBe(1);
    expect(engine.y[0]).toBe(0);
    expect(Math.hypot(engine.x[1] - engine.x[0], engine.y[1] - engine.y[0]))
      .toBeGreaterThanOrEqual(37.75);
  });

  it('separates coincident node radii with the collision pass', () => {
    const nodeCount = 40;
    const radius = 5;
    const collisionPadding = 2;
    const engine = createGraphLayoutEngine({
      nodeIds: Array.from({ length: nodeCount }, (_, index) => `node-${index}`),
      initialX: new Float32Array(nodeCount),
      initialY: new Float32Array(nodeCount),
      radii: new Float32Array(nodeCount).fill(radius),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      centralGravity: 0,
      collisionIterations: 3,
      collisionPadding,
      collisionStrength: 1,
      chargeStrength: 0,
    });

    for (let tick = 0; tick < 600; tick += 1) engine.tick();

    let closestDistance = Number.POSITIVE_INFINITY;
    for (let first = 0; first < nodeCount; first += 1) {
      for (let second = first + 1; second < nodeCount; second += 1) {
        closestDistance = Math.min(
          closestDistance,
          Math.hypot(engine.x[second] - engine.x[first], engine.y[second] - engine.y[first]),
        );
      }
    }
    expect(closestDistance).toBeGreaterThanOrEqual(radius * 2 + collisionPadding - 0.5);
  });

});
