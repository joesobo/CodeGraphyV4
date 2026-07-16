import { describe, expect, it } from 'vitest';

import { createGraphLayoutEngine, GraphNodeFlag } from '@graph-renderer/physics';
import { graphNodeWorldScale } from '@graph-renderer/visualSize';
import { lineGraph } from './fixture';

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

  it('separates settled nodes using the camera-scaled collision envelope', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['small', 'large'],
      initialX: Float32Array.of(0, 39),
      initialY: Float32Array.of(0, 0),
      radii: Float32Array.of(8, 30),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      alphaDecay: 1,
      centralGravity: 0,
      chargeStrength: 0,
      collisionIterations: 1,
      collisionStrength: 1,
      settleSteps: 1,
    });
    engine.tick();
    expect(engine.settled).toBe(true);

    engine.setCollisionScale(4);
    expect(engine.settled).toBe(false);
    engine.tick();

    expect(Math.hypot(engine.x[1] - engine.x[0], engine.y[1] - engine.y[0]))
      .toBeGreaterThanOrEqual(151.75);
    expect(engine.settled).toBe(true);

    engine.setCollisionScale(4);
    expect(engine.settled).toBe(true);
    engine.setCollisionScale(1);
    expect(engine.settled).toBe(true);
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

  it.each([0.005, 0.02, 0.1, 1, 4, 64])(
    'separates minimum and maximum node radii at supported zoom %s',
    (zoom) => {
      const engine = createGraphLayoutEngine({
        nodeIds: ['minimum', 'maximum'],
        initialX: Float32Array.of(0, 1),
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
      const collisionScale = graphNodeWorldScale(zoom);

      engine.setCollisionScale(collisionScale);
      engine.tick();

      expect(engine.x[0]).toBe(0);
      expect(engine.y[0]).toBe(0);
      expect(Math.hypot(engine.x[1] - engine.x[0], engine.y[1] - engine.y[0]))
        .toBeGreaterThanOrEqual(38 * collisionScale - 0.25);
    },
  );

  it('keeps an empty settled graph idle when collision scale expands', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: [],
      radii: new Float32Array(),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });
    expect(engine.tick()).toEqual({ moving: false, settled: true, steps: 0 });

    engine.setCollisionScale(2);

    expect(engine.settled).toBe(true);
    expect(engine.tick()).toEqual({ moving: false, settled: true, steps: 0 });
  });

  it.each([0, -1, 101, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid camera collision scale %s',
    (scale) => {
      const engine = createGraphLayoutEngine(lineGraph(2));

      expect(() => engine.setCollisionScale(scale))
        .toThrow('Collision scale must be greater than zero');
    },
  );

  it('does not commit a collision scale when derived kernel configuration rejects it', () => {
    const control = createGraphLayoutEngine(lineGraph(2));
    const engine = createGraphLayoutEngine(lineGraph(2));

    expect(() => engine.setCollisionScale(Number.MAX_VALUE)).toThrow();
    expect(() => engine.setCollisionScale(Number.MAX_VALUE)).toThrow();

    expect(engine.tick()).toEqual(control.tick());
    expect(engine.x).toEqual(control.x);
    expect(engine.y).toEqual(control.y);
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
