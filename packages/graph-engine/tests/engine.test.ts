import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  createGraphLayoutEngine,
  GraphNodeFlag,
  type GraphLayoutInput,
} from '../src/engine';

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
  it('produces identical positions for identical input and fixed ticks', () => {
    const first = createGraphLayoutEngine(lineGraph(64));
    const second = createGraphLayoutEngine(lineGraph(64));

    for (let tick = 0; tick < 300; tick += 1) {
      first.tick(1000 / 60);
      second.tick(1000 / 60);
    }

    expect(positionHash(first.x, first.y)).toBe(positionHash(second.x, second.y));
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
      centerForce: 0,
      collisionIterations: 3,
      collisionPadding,
      collisionStrength: 1,
      repelForce: 0,
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
    }, { centerForce: 0, repelForce: 0 });

    for (let tick = 0; tick < 30; tick += 1) engine.tick(1000 / 60);

    expect(engine.x[0]).toBeGreaterThan(0);
    expect(engine.y[0]).toBe(0);
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
