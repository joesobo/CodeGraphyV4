import { describe, expect, it } from 'vitest';

import { createGraphLayoutEngine, GraphNodeFlag, type GraphLayoutInput } from '@graph-renderer/physics';
import { lineGraph } from './fixture';

describe('graph layout engine', () => {
  it('applies many-body repulsion across the entire graph', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['left', 'right'],
      initialX: Float32Array.of(-500, 500),
      initialY: Float32Array.of(0, 0),
      radii: Float32Array.of(1, 1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      centralGravity: 0,
      collisionIterations: 0,
      velocityDecay: 0,
      chargeStrength: -250,
    });

    engine.tick();

    expect(engine.vx[0]).toBeLessThan(0);
    expect(engine.vx[1]).toBeGreaterThan(0);
  });

  it('keeps pinned nodes fixed while their charge still repels movable nodes', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['pinned', 'movable'],
      initialX: Float32Array.of(0, 20),
      initialY: Float32Array.of(0, 0),
      radii: Float32Array.of(1, 1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      centralGravity: 0,
      collisionIterations: 0,
      velocityDecay: 0,
      chargeStrength: -250,
    });
    engine.pin(0);

    engine.tick();

    expect(engine.x[0]).toBe(0);
    expect(engine.vx[0]).toBe(0);
    expect(engine.vx[1]).toBeGreaterThan(0);
  });

  it('applies per-node plugin charge multipliers to repulsion sources', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['disabled-source', 'normal-source'],
      initialX: Float32Array.of(0, 20),
      initialY: Float32Array.of(0, 0),
      chargeStrengthMultipliers: Float32Array.of(0, 1),
      radii: Float32Array.of(1, 1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      centralGravity: 0,
      collisionIterations: 0,
      velocityDecay: 0,
      chargeStrength: -250,
    });

    engine.tick();

    expect(engine.vx[0]).toBeLessThan(0);
    expect(engine.vx[1]).toBe(0);
  });

  it('uses velocityDecay to suppress release velocity', () => {
    const input: GraphLayoutInput = {
      nodeIds: ['node-0'],
      initialX: new Float32Array([0]),
      initialY: new Float32Array([0]),
      initialVx: new Float32Array([10]),
      initialVy: new Float32Array([0]),
      radii: new Float32Array([4]),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    };
    const highDecay = createGraphLayoutEngine(input, {
      centralGravity: 0,
      velocityDecay: 0.7,
      chargeStrength: 0,
    });
    const lowDecay = createGraphLayoutEngine(input, {
      centralGravity: 0,
      velocityDecay: 0.1,
      chargeStrength: 0,
    });

    highDecay.tick();
    lowDecay.tick();

    expect(highDecay.vx[0]).toBeCloseTo(3);
    expect(lowDecay.vx[0]).toBeCloseTo(9);
    expect(highDecay.vx[0]).toBeLessThan(lowDecay.vx[0]);
  });

  it('warms toward an alpha target during interaction and cools after release', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['node-0'],
      initialX: Float32Array.of(0),
      initialY: Float32Array.of(0),
      radii: Float32Array.of(1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      centralGravity: 0,
      collisionIterations: 0,
      chargeStrength: 0,
    });
    for (let tick = 0; tick < 320; tick += 1) engine.tick();
    const coldAlpha = engine.alpha;

    engine.setAlphaTarget(0.3);
    for (let tick = 0; tick < 10; tick += 1) engine.tick();

    expect(engine.settled).toBe(false);
    expect(engine.alpha).toBeGreaterThan(coldAlpha);
    expect(engine.alpha).toBeLessThan(0.3);

    engine.setAlphaTarget(0);
    const warmAlpha = engine.alpha;
    engine.tick();

    expect(engine.alpha).toBeLessThan(warmAlpha);
  });

  it.each([-0.1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid alpha target %s',
    alpha => {
      const engine = createGraphLayoutEngine(lineGraph(1));

      expect(() => engine.setAlphaTarget(alpha))
        .toThrow('Graph layout alpha target must be between zero and one');
    },
  );

  it('keeps settled physics cold for a zero alpha target', () => {
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
      settleSteps: 1,
    });
    engine.tick();
    expect(engine.settled).toBe(true);

    engine.setAlphaTarget(0);

    expect(engine.tick()).toEqual({ moving: false, settled: true, steps: 0 });
  });

  it('reheats settled physics when force settings change', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['node-0'],
      initialX: new Float32Array([100]),
      initialY: new Float32Array([0]),
      radii: new Float32Array([4]),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      centralGravity: 0,
      chargeStrength: 0,
    });
    for (let tick = 0; tick < 320; tick += 1) engine.tick();
    expect(engine.settled).toBe(true);

    engine.setConfig({ centralGravity: 1 });
    expect(engine.settled).toBe(false);
    expect(engine.alpha).toBeCloseTo(0.3);
    engine.tick();

    expect(engine.x[0]).toBeLessThan(100);
  });

  it('reconfigures collision grid cell size when padding changes', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['first', 'second'],
      initialX: Float32Array.of(0, 11),
      initialY: Float32Array.of(0, 0),
      radii: Float32Array.of(5, 5),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      centralGravity: 0,
      chargeStrength: 0,
      collisionIterations: 1,
      collisionPadding: 0,
      collisionStrength: 1,
      velocityDecay: 0,
    });

    engine.setConfig({ collisionPadding: 4 });
    engine.tick();

    expect(engine.x[1] - engine.x[0]).toBeCloseTo(14, 5);
  });

  it('rejects a non-positive reheat alpha', () => {
    const engine = createGraphLayoutEngine(lineGraph(1));

    expect(() => engine.reheat(0))
      .toThrow('Graph layout reheat alpha must be greater than zero and at most one');
  });

  it('keeps a pinned node fixed until release', () => {
    const engine = createGraphLayoutEngine(lineGraph(3));
    engine.setNodePosition(1, 25, -10);
    engine.pin(1);

    for (let tick = 0; tick < 60; tick += 1) engine.tick();

    expect(engine.flags[1] & GraphNodeFlag.Pinned).toBe(GraphNodeFlag.Pinned);
    expect([engine.x[1], engine.y[1]]).toEqual([25, -10]);

    engine.release(1);
    engine.reheat();
    for (let tick = 0; tick < 60; tick += 1) engine.tick();

    expect([engine.x[1], engine.y[1]]).not.toEqual([25, -10]);
  });

  it('does not advance while paused', () => {
    const engine = createGraphLayoutEngine(lineGraph(8));
    const initialX = [...engine.x];
    const initialY = [...engine.y];

    engine.pause();
    const pausedTick = engine.tick();

    expect(pausedTick.moving).toBe(false);
    expect([...engine.x]).toEqual(initialX);
    expect([...engine.y]).toEqual(initialY);

    engine.resume();
    engine.tick();
    expect([...engine.x]).not.toEqual(initialX);
  });
});
