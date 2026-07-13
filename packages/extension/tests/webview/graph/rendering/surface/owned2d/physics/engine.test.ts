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

describe('graph layout engine', () => {
  it('treats an empty graph as settled', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: [],
      radii: new Float32Array(),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });

    expect(engine.tick(1000 / 60)).toEqual({ moving: false, settled: true, steps: 0 });
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

    engine.tick(1000 / 60);

    expect(engine.alpha).toBeCloseTo(Math.pow(0.001, 1 / 150), 12);
    for (let tick = 1; tick < 160; tick += 1) engine.tick(1000 / 60);
    expect(engine.settled).toBe(true);
  });

  it('produces identical positions for identical input and fixed ticks', () => {
    const first = createGraphLayoutEngine(lineGraph(64));
    const second = createGraphLayoutEngine(lineGraph(64));

    for (let tick = 0; tick < 300; tick += 1) {
      first.tick(1000 / 60);
      second.tick(1000 / 60);
    }

    expect(positionHash(first.x, first.y)).toBe(positionHash(second.x, second.y));
  });

  it('produces the same fixed-step layout at 30fps and 120fps tick cadence', () => {
    const at30Fps = createGraphLayoutEngine(lineGraph(64));
    const at120Fps = createGraphLayoutEngine(lineGraph(64));

    for (let frame = 0; frame < 60; frame += 1) at30Fps.tick(1000 / 30);
    for (let frame = 0; frame < 240; frame += 1) at120Fps.tick(1000 / 120);

    expect(positionHash(at30Fps.x, at30Fps.y)).toBe(positionHash(at120Fps.x, at120Fps.y));
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

    for (let tick = 0; tick < 600; tick += 1) engine.tick(1000 / 60);

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

    engine.tick(1000 / 60);

    expect(Math.hypot(engine.x[1] - engine.x[0], engine.y[1] - engine.y[0]))
      .toBeGreaterThanOrEqual(21.99);
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

    for (let tick = 0; tick < 600; tick += 1) engine.tick(1000 / 60);

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

    engine.tick(1000 / 60);

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

    engine.tick(1000 / 60);

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

    engine.tick(1000 / 60);

    expect(engine.vx[0]).toBeLessThan(0);
    expect(engine.vx[1]).toBe(0);
  });

  it('pulls nodes toward optional layout constraint targets', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['node-0'],
      initialX: new Float32Array([0]),
      initialY: new Float32Array([0]),
      radii: new Float32Array([4]),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
      targetX: new Float32Array([100]),
      targetY: new Float32Array([Number.NaN]),
    }, { centralGravity: 0, chargeStrength: 0 });

    for (let tick = 0; tick < 30; tick += 1) engine.tick(1000 / 60);

    expect(engine.x[0]).toBeGreaterThan(0);
    expect(engine.y[0]).toBe(0);
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

    highDecay.tick(1000 / 60);
    lowDecay.tick(1000 / 60);

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
    for (let tick = 0; tick < 320; tick += 1) engine.tick(1000 / 60);
    const coldAlpha = engine.alpha;

    engine.setAlphaTarget(0.3);
    for (let tick = 0; tick < 10; tick += 1) engine.tick(1000 / 60);

    expect(engine.settled).toBe(false);
    expect(engine.alpha).toBeGreaterThan(coldAlpha);
    expect(engine.alpha).toBeLessThan(0.3);

    engine.setAlphaTarget(0);
    const warmAlpha = engine.alpha;
    engine.tick(1000 / 60);

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
    for (let tick = 0; tick < 320; tick += 1) engine.tick(1000 / 60);
    expect(engine.settled).toBe(true);

    engine.setConfig({ centralGravity: 1 });
    expect(engine.settled).toBe(false);
    engine.tick(1000 / 60);

    expect(engine.x[0]).toBeLessThan(100);
  });

  it('keeps a pinned node fixed until release', () => {
    const engine = createGraphLayoutEngine(lineGraph(3));
    engine.setNodePosition(1, 25, -10);
    engine.pin(1);

    for (let tick = 0; tick < 60; tick += 1) engine.tick(1000 / 60);

    expect(engine.flags[1] & GraphNodeFlag.Pinned).toBe(GraphNodeFlag.Pinned);
    expect([engine.x[1], engine.y[1]]).toEqual([25, -10]);

    engine.release(1);
    engine.reheat();
    for (let tick = 0; tick < 60; tick += 1) engine.tick(1000 / 60);

    expect([engine.x[1], engine.y[1]]).not.toEqual([25, -10]);
  });

  it('does not advance while paused', () => {
    const engine = createGraphLayoutEngine(lineGraph(8));
    const initialX = [...engine.x];
    const initialY = [...engine.y];

    engine.pause();
    engine.tick(1_000);

    expect([...engine.x]).toEqual(initialX);
    expect([...engine.y]).toEqual(initialY);

    engine.resume();
    engine.tick(1000 / 60);
    expect([...engine.x]).not.toEqual(initialX);
  });
});
