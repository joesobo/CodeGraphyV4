import { describe, expect, it } from 'vitest';

import { createGraphLayoutEngine } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';

describe('WASM collision spatial grid', () => {
  it('resolves adjacent-cell overlaps without touching distant cells', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['first', 'nearby', 'distant', 'far-away'],
      initialX: Float32Array.from([0, 9, 29, 100]),
      initialY: Float32Array.from([0, 0, 0, 100]),
      radii: Float32Array.from([5, 5, 1, 1]),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      centralGravity: 0,
      chargeStrength: 0,
      collisionIterations: 1,
      collisionStrength: 1,
      velocityDecay: 0,
    });

    engine.tick();

    expect(engine.x[1] - engine.x[0]).toBeCloseTo(10, 5);
    expect(engine.x[2]).toBe(29);
    expect(engine.x[3]).toBe(100);
    expect(engine.y[3]).toBe(100);
  });

  it('preserves distinct cells that share the same integer hash', () => {
    const firstCell = { x: -979, y: 430 };
    const secondCell = { x: -973, y: -332 };
    const key = (x: number, y: number) => (
      Math.imul(x, 73_856_093) ^ Math.imul(y, 19_349_663)
    );
    expect(key(firstCell.x, firstCell.y)).toBe(key(secondCell.x, secondCell.y));
    const positionsX = [
      firstCell.x * 4,
      firstCell.x * 4 + 1,
      secondCell.x * 4,
      secondCell.x * 4 + 1,
    ];
    const positionsY = [
      firstCell.y * 4,
      firstCell.y * 4,
      secondCell.y * 4,
      secondCell.y * 4,
    ];
    const engine = createGraphLayoutEngine({
      nodeIds: ['first-a', 'first-b', 'second-a', 'second-b'],
      initialX: Float32Array.from(positionsX),
      initialY: Float32Array.from(positionsY),
      radii: new Float32Array(4).fill(2),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      centralGravity: 0,
      chargeStrength: 0,
      collisionIterations: 1,
      collisionStrength: 1,
      velocityDecay: 0,
    });

    engine.tick();

    expect(engine.x[1] - engine.x[0]).toBeCloseTo(4, 5);
    expect(engine.x[3] - engine.x[2]).toBeCloseTo(4, 5);
  });

  it('preserves fractional maximum-neighbor semantics', () => {
    const collide = (maximumCollisionNeighbors: number): Float32Array => {
      const engine = createGraphLayoutEngine({
        nodeIds: ['first', 'overlapping', 'non-overlapping'],
        initialX: Float32Array.of(0, 1, 3.9),
        initialY: Float32Array.of(0, 0, 0),
        radii: Float32Array.of(2, 2, 0.1),
        edgeSources: new Uint32Array(),
        edgeTargets: new Uint32Array(),
      }, {
        centralGravity: 0,
        chargeStrength: 0,
        collisionIterations: 1,
        collisionStrength: 1,
        maximumCollisionNeighbors,
        velocityDecay: 0,
      });
      engine.tick();
      return engine.x;
    };

    const oneNeighbor = collide(1);
    const fractionalNeighbors = collide(1.5);
    const twoNeighbors = collide(2);

    expect(fractionalNeighbors).toEqual(twoNeighbors);
    expect(fractionalNeighbors).not.toEqual(oneNeighbor);
  });

  it('preserves fractional collision-iteration semantics', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['first', 'second'],
      initialX: Float32Array.of(0, 1),
      initialY: Float32Array.of(0, 0),
      radii: Float32Array.of(5, 5),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      centralGravity: 0,
      chargeStrength: 0,
      collisionIterations: 1.5,
      collisionStrength: 0.5,
      velocityDecay: 0,
    });

    engine.tick();

    expect(engine.x[1] - engine.x[0]).toBeCloseTo(7.75, 5);
  });
});
