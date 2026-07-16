import { describe, expect, it } from 'vitest';

import { createGraphLayoutEngine } from '@graph-renderer/physics';

describe('graph physics integration', () => {
  it('applies the reference velocity decay before position integration', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['first', 'second'],
      initialX: Float32Array.of(20, -30),
      initialY: Float32Array.of(40, 10),
      initialVx: Float32Array.of(10, -4),
      initialVy: Float32Array.of(-5, 8),
      radii: Float32Array.of(1, 1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      alphaDecay: 0,
      centralGravity: 0,
      chargeStrength: 0,
      collisionIterations: 0,
      velocityDecay: 0.4,
    });

    engine.tick();

    expect(Array.from(engine.x)).toEqual([26, -32.400001525878906]);
    expect(Array.from(engine.y)).toEqual([37, 14.800000190734863]);
    expect(Array.from(engine.vx)).toEqual([6, -2.4000000953674316]);
    expect(Array.from(engine.vy)).toEqual([-3, 4.800000190734863]);
  });
});
