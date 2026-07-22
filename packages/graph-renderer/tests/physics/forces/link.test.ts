import { describe, expect, it } from 'vitest';

import { createGraphLayoutEngine } from '@graph-renderer/physics';

function expectValues(actual: Float32Array, expected: readonly number[]): void {
  expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, 5));
}

describe('graph link force', () => {
  it('matches the reference degree bias and predicted-position impulses', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['hub', 'leaf-a', 'leaf-b'],
      initialX: Float32Array.of(0, 100, 200),
      initialY: Float32Array.of(0, 0, 0),
      initialVx: Float32Array.of(4, -2, 1),
      initialVy: Float32Array.of(0, 0, 0),
      radii: Float32Array.of(1, 1, 1),
      edgeSources: Uint32Array.of(0, 0),
      edgeTargets: Uint32Array.of(1, 2),
    }, {
      alphaDecay: 0,
      centralGravity: 0,
      collisionIterations: 0,
      velocityDecay: 0,
      chargeStrength: 0,
      linkStrength: 1,
      linkDistance: 50,
    });

    engine.tick();

    expectValues(engine.x, [62.777777778, 68.666666667, 112.777777778]);
    expectValues(engine.vx, [62.777777778, -31.333333333, -87.222222222]);
  });

  it('preserves the direction of short nonzero link displacement', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['first', 'second'],
      initialX: Float32Array.of(0, 0.005),
      initialY: Float32Array.of(0, 0),
      radii: Float32Array.of(0.0001, 0.0001),
      edgeSources: Uint32Array.of(0),
      edgeTargets: Uint32Array.of(1),
    }, {
      alphaDecay: 0,
      centralGravity: 0,
      chargeStrength: 0,
      collisionIterations: 0,
      linkDistance: 0.001,
      linkStrength: 1,
      velocityDecay: 0,
    });

    engine.tick();

    expect(engine.x[0]).toBeCloseTo(0.002, 5);
    expect(engine.x[1]).toBeCloseTo(0.003, 5);
  });
});
