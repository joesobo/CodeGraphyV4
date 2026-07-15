import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  createGraphLayoutEngine,
  GraphNodeFlag,
  type GraphLayoutInput,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';

function lineGraph(nodeCount: number): GraphLayoutInput {
  return {
    nodeIds: Array.from({ length: nodeCount }, (_, index) => `node-${index}`),
    radii: new Float32Array(nodeCount).fill(4),
    edgeSources: Uint32Array.from(
      Array.from({ length: nodeCount - 1 }, (_, index) => index),
    ),
    edgeTargets: Uint32Array.from(
      Array.from({ length: nodeCount - 1 }, (_, index) => index + 1),
    ),
  };
}

function positionHash(x: Float32Array, y: Float32Array): string {
  const hash = createHash('sha256');
  hash.update(new Uint8Array(x.buffer, x.byteOffset, x.byteLength));
  hash.update(new Uint8Array(y.buffer, y.byteOffset, y.byteLength));
  return hash.digest('hex');
}

function kinematicsHash(engine: {
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
}): string {
  const hash = createHash('sha256');
  for (const values of [engine.x, engine.y, engine.vx, engine.vy]) {
    hash.update(new Uint8Array(values.buffer, values.byteOffset, values.byteLength));
  }
  return hash.digest('hex');
}

describe('graph layout engine', () => {
  it('uses D3 deterministic phyllotaxis for missing positions', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['node-0', 'node-1', 'node-2'],
      radii: Float32Array.of(1, 1, 1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });

    expect(engine.x[0]).toBeCloseTo(7.071_068, 5);
    expect(engine.y[0]).toBeCloseTo(0, 5);
    expect(engine.x[1]).toBeCloseTo(-9.030_888, 5);
    expect(engine.y[1]).toBeCloseTo(8.273_033, 5);
    expect(engine.x[2]).toBeCloseTo(1.382_322, 5);
    expect(engine.y[2]).toBeCloseTo(-15.750_847, 5);
  });

  it('treats an empty graph as settled', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: [],
      radii: new Float32Array(),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });

    expect(engine.tick()).toEqual({ moving: false, settled: true, steps: 0 });
  });

  it('cools D3 alpha within the Obsidian-like release-settle window', () => {
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

    engine.tick();

    expect(engine.alpha).toBeCloseTo(Math.pow(0.001, 1 / 300), 12);
    for (let tick = 1; tick < 310; tick += 1) engine.tick();
    expect(engine.settled).toBe(true);
  });

  it('produces identical positions for identical input and fixed ticks', () => {
    const first = createGraphLayoutEngine(lineGraph(64));
    const second = createGraphLayoutEngine(lineGraph(64));

    for (let tick = 0; tick < 300; tick += 1) {
      first.tick();
      second.tick();
    }

    expect(positionHash(first.x, first.y)).toBe(positionHash(second.x, second.y));
  });

  it('matches the former TypeScript mixed-force trajectory exactly', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['a', 'b', 'c', 'd', 'e', 'f'],
      initialX: Float32Array.of(0, 0, 24, -18, 11, -7),
      initialY: Float32Array.of(0, 0, -9, 14, 21, -16),
      initialVx: Float32Array.of(1.25, -0.75, 0.5, -1.5, 0.25, 2),
      initialVy: Float32Array.of(-0.5, 1.75, -1, 0.5, -0.25, 1),
      chargeStrengthMultipliers: Float32Array.of(1, 0.5, 1.5, 0, 2, 0.75),
      radii: Float32Array.of(8, 10, 6, 12, 9, 7),
      flags: Uint8Array.of(0, GraphNodeFlag.Pinned, 0, GraphNodeFlag.Hidden, 0, 0),
      edgeSources: Uint32Array.of(0, 0, 1, 2, 4, 5, 3),
      edgeTargets: Uint32Array.of(1, 2, 4, 5, 5, 0, 0),
    }, {
      alphaDecay: 0.031,
      alphaMinimum: 0.0005,
      centralGravity: 0.17,
      chargeDistanceMax: 240,
      chargeDistanceMin: 2.5,
      chargeStrength: -37,
      chargeTheta: 0.83,
      collisionIterations: 2.5,
      collisionPadding: 1.75,
      collisionStrength: 0.65,
      initializationSpacing: 11,
      linkDistance: 34,
      linkStrength: 0.42,
      maximumCollisionNeighbors: 7.5,
      settleSpeed: 0.02,
      settleSteps: 4,
      velocityDecay: 0.27,
    });
    // Generated from the pre-WASM TypedGraphLayoutEngine at revision 64229ddc3.
    const expected: ReadonlyMap<number, readonly [string, number]> = new Map([
      [1, ['046607b1d550721003088443d2b120c0df55b8f3bce6831a11efe8ef0a9e5be1', 0.969]],
      [4, ['3b0be6c617ab003f060c2deeba78771bce4c44a3b63eb5696457c6a57bf44ee9', 0.8816477595209999]],
      [8, ['a3355cffdd910644769365112996515b683be18448b59f35e560a8dba1a53a85', 0.777302771868399]],
    ]);

    for (let tick = 1; tick <= 8; tick += 1) {
      engine.tick();
      const snapshot = expected.get(tick);
      if (snapshot) {
        expect(kinematicsHash(engine)).toBe(snapshot[0]);
        expect(engine.alpha).toBe(snapshot[1]);
      }
    }
  });

  it('advances one fixed simulation step per display-frame tick', () => {
    const sixtyFrames = createGraphLayoutEngine(lineGraph(64));
    const repeatedSixtyFrames = createGraphLayoutEngine(lineGraph(64));
    const twoHundredFortyFrames = createGraphLayoutEngine(lineGraph(64));

    for (let frame = 0; frame < 60; frame += 1) {
      sixtyFrames.tick();
      repeatedSixtyFrames.tick();
    }
    for (let frame = 0; frame < 240; frame += 1) twoHundredFortyFrames.tick();

    expect(positionHash(sixtyFrames.x, sixtyFrames.y))
      .toBe(positionHash(repeatedSixtyFrames.x, repeatedSixtyFrames.y));
    expect(positionHash(sixtyFrames.x, sixtyFrames.y))
      .not.toBe(positionHash(twoHundredFortyFrames.x, twoHundredFortyFrames.y));
  });

  it('preserves deterministic repulsion state when graph storage is replaced', () => {
    const input: GraphLayoutInput = {
      nodeIds: ['first', 'second', 'third'],
      initialX: new Float32Array(3),
      initialY: new Float32Array(3),
      radii: new Float32Array(3).fill(1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    };
    const config = {
      centralGravity: 0,
      collisionIterations: 0,
      velocityDecay: 0,
    };
    const replaced = createGraphLayoutEngine(input, config);
    const retained = createGraphLayoutEngine(input, config);
    replaced.tick();
    retained.tick();

    replaced.setGraph(input);
    retained.setKinematics(
      new Float32Array(3),
      new Float32Array(3),
      new Float32Array(3),
      new Float32Array(3),
    );
    retained.reheat();
    replaced.tick();
    retained.tick();

    expect(replaced.x).toEqual(retained.x);
    expect(replaced.y).toEqual(retained.y);
    expect(replaced.vx).toEqual(retained.vx);
    expect(replaced.vy).toEqual(retained.vy);
  });

  it('refreshes engine views after rare Barnes-Hut storage growth', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['origin', 'subnormal', 'extreme'],
      initialX: Float32Array.of(0, Math.fround(1.4e-45), Math.fround(3e38)),
      initialY: Float32Array.of(0, 0, Math.fround(3e38)),
      radii: Float32Array.of(1, 1, 1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      centralGravity: 0,
      collisionIterations: 0,
    });
    const initialBuffer = engine.x.buffer;

    engine.tick();

    expect(engine.x.buffer).not.toBe(initialBuffer);
    engine.setNodePosition(0, 12, -4);
    engine.pin(0);
    engine.tick();
    expect([engine.x[0], engine.y[0], engine.vx[0], engine.vy[0]])
      .toEqual([12, -4, 0, 0]);
    expect([...engine.x, ...engine.y, ...engine.vx, ...engine.vy].every(Number.isFinite))
      .toBe(true);
  });

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

    engine.setCollisionScale(2);
    expect(engine.settled).toBe(false);
    engine.tick();

    expect(Math.hypot(engine.x[1] - engine.x[0], engine.y[1] - engine.y[0]))
      .toBeGreaterThanOrEqual(75.75);
    expect(engine.settled).toBe(true);

    engine.setCollisionScale(2);
    expect(engine.settled).toBe(true);
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

    expect(() => engine.reheat(0)).toThrow('reheat alpha must be positive');
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
