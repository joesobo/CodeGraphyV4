import { describe, expect, it, vi } from 'vitest';

import {
  createGraphLayoutEngine,
  MAX_GRAPH_COORDINATE,
  MAX_GRAPH_VELOCITY,
} from '@graph-renderer/physics';
import { kinematicsHash, lineGraph } from './fixture';

describe('graph layout engine', () => {
  it('copies external kinematics but treats authoritative views as a change notification', () => {
    const engine = createGraphLayoutEngine(lineGraph(3));
    const setX = vi.spyOn(engine.x, 'set');
    const setY = vi.spyOn(engine.y, 'set');
    const setVx = vi.spyOn(engine.vx, 'set');
    const setVy = vi.spyOn(engine.vy, 'set');
    const externalX = Float32Array.of(1, 2, 3);
    const externalY = Float32Array.of(4, 5, 6);
    const externalVx = Float32Array.of(7, 8, 9);
    const externalVy = Float32Array.of(10, 11, 12);

    engine.setKinematics(externalX, externalY, externalVx, externalVy);

    expect(setX).toHaveBeenCalledWith(externalX);
    expect(setY).toHaveBeenCalledWith(externalY);
    expect(setVx).toHaveBeenCalledWith(externalVx);
    expect(setVy).toHaveBeenCalledWith(externalVy);
    setX.mockClear();
    setY.mockClear();
    setVx.mockClear();
    setVy.mockClear();

    engine.setKinematics(engine.x, engine.y, engine.vx, engine.vy);

    expect(setX).not.toHaveBeenCalled();
    expect(setY).not.toHaveBeenCalled();
    expect(setVx).not.toHaveBeenCalled();
    expect(setVy).not.toHaveBeenCalled();
    expect(engine.settled).toBe(false);
  });

  it('rejects non-finite external kinematics without changing engine state', () => {
    const engine = createGraphLayoutEngine(lineGraph(2));
    const before = kinematicsHash(engine);

    expect(() => engine.setKinematics(
      Float32Array.of(Number.NaN, 0),
      Float32Array.of(0, 0),
      Float32Array.of(0, 0),
      Float32Array.of(0, 0),
    )).toThrow('Graph layout kinematics must be finite');

    expect(kinematicsHash(engine)).toBe(before);
  });

  it.each(['x', 'y', 'vx', 'vy'] as const)(
    'rejects a %s array whose length does not match the node count',
    field => {
      const engine = createGraphLayoutEngine(lineGraph(2));
      const before = kinematicsHash(engine);
      const values = {
        x: Float32Array.of(1, 2),
        y: Float32Array.of(3, 4),
        vx: Float32Array.of(5, 6),
        vy: Float32Array.of(7, 8),
      };
      values[field] = Float32Array.of(1);

      expect(() => engine.setKinematics(values.x, values.y, values.vx, values.vy))
        .toThrow('Graph layout kinematics must match node count');
      expect(kinematicsHash(engine)).toBe(before);
    },
  );

  it.each([
    ['x', Number.NaN, 0],
    ['y', 0, Number.POSITIVE_INFINITY],
  ] as const)('rejects a non-finite %s node position', (_axis, x, y) => {
    const engine = createGraphLayoutEngine(lineGraph(1));
    const before = kinematicsHash(engine);

    expect(() => engine.setNodePosition(0, x, y))
      .toThrow('Graph node position must be finite');
    expect(kinematicsHash(engine)).toBe(before);
  });

  it.each([-1, 0.5, 2])('rejects invalid node index %s', index => {
    const engine = createGraphLayoutEngine(lineGraph(2));
    const before = kinematicsHash(engine);

    expect(() => engine.setNodePosition(index, 10, 20))
      .toThrow(`Graph node index is out of bounds: ${index}`);
    expect(kinematicsHash(engine)).toBe(before);
  });

  it('requires a full calm window after a node position changes', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['node'],
      initialX: Float32Array.of(0),
      initialY: Float32Array.of(0),
      radii: Float32Array.of(1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      alphaDecay: 1,
      centralGravity: 0,
      chargeStrength: 0,
      collisionIterations: 0,
      settleSteps: 3,
    });
    engine.tick();
    engine.tick();

    engine.setNodePosition(0, 10, 5);

    expect(engine.tick().settled).toBe(false);
    expect(engine.tick().settled).toBe(false);
    expect(engine.tick().settled).toBe(true);
  });

  it('rejects replacement kinematics outside coordinate and velocity domains atomically', () => {
    const coordinateEngine = createGraphLayoutEngine(lineGraph(1));
    const coordinateBefore = kinematicsHash(coordinateEngine);
    expect(() => coordinateEngine.setKinematics(
      Float32Array.of(MAX_GRAPH_COORDINATE * 2),
      coordinateEngine.y,
      coordinateEngine.vx,
      coordinateEngine.vy,
    )).toThrow(/x coordinates/);
    expect(kinematicsHash(coordinateEngine)).toBe(coordinateBefore);

    const velocityEngine = createGraphLayoutEngine(lineGraph(1));
    const velocityBefore = kinematicsHash(velocityEngine);
    expect(() => velocityEngine.setKinematics(
      velocityEngine.x,
      velocityEngine.y,
      Float32Array.of(MAX_GRAPH_VELOCITY * 2),
      velocityEngine.vy,
    )).toThrow(/x velocities/);
    expect(kinematicsHash(velocityEngine)).toBe(velocityBefore);
  });

  it('does not settle while node velocity exceeds the calm threshold', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['node'],
      initialX: Float32Array.of(0),
      initialY: Float32Array.of(0),
      initialVx: Float32Array.of(10),
      initialVy: Float32Array.of(0),
      radii: Float32Array.of(1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      alphaDecay: 1,
      centralGravity: 0,
      chargeStrength: 0,
      collisionIterations: 0,
      settleSpeed: 0.1,
      settleSteps: 1,
      velocityDecay: 0,
    });

    expect(engine.tick()).toEqual({ moving: true, settled: false, steps: 1 });
  });

  it.each([
    [Number.MAX_VALUE, 0],
    [-Number.MAX_VALUE, 0],
    [0, Number.MAX_VALUE],
  ])('rejects positions outside Float32 range without changing state', (x, y) => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['node'],
      initialX: Float32Array.of(1),
      initialY: Float32Array.of(2),
      initialVx: Float32Array.of(3),
      initialVy: Float32Array.of(4),
      radii: Float32Array.of(1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });
    const before = kinematicsHash(engine);

    expect(() => engine.setNodePosition(0, x, y)).toThrow(/32-bit float/);

    expect(kinematicsHash(engine)).toBe(before);
  });

  it('rejects positions outside the supported coordinate domain without changing state', () => {
    const engine = createGraphLayoutEngine(lineGraph(1));
    const before = kinematicsHash(engine);

    expect(() => engine.setNodePosition(0, MAX_GRAPH_COORDINATE + 1, 0))
      .toThrow(/magnitude/);

    expect(kinematicsHash(engine)).toBe(before);
  });

  it('does not settle on a tick that corrects an overlap', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['first', 'second'],
      initialX: Float32Array.of(0, 0),
      initialY: Float32Array.of(0, 0),
      radii: Float32Array.of(10, 10),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      alphaDecay: 1,
      centralGravity: 0,
      chargeStrength: 0,
      collisionIterations: 1,
      collisionStrength: 0.01,
      settleSpeed: 100_000,
      settleSteps: 1,
    });

    expect(engine.tick()).toEqual({ moving: true, settled: false, steps: 1 });
  });
});
