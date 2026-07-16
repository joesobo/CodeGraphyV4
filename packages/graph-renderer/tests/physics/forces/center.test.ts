import { describe, expect, it } from 'vitest';

import { createGraphLayoutEngine } from '@graph-renderer/physics';

describe('graph center force', () => {
  it('matches the reference x/y centering impulses', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['first', 'second'],
      initialX: Float32Array.of(100, -200),
      initialY: Float32Array.of(-50, 80),
      initialVx: Float32Array.of(2, -3),
      initialVy: Float32Array.of(-1, 4),
      radii: Float32Array.of(1, 1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      alphaDecay: 0,
      centralGravity: 0.1,
      chargeStrength: 0,
      collisionIterations: 0,
      velocityDecay: 0,
    });

    engine.tick();

    expect(Array.from(engine.x)).toEqual([92, -183]);
    expect(Array.from(engine.y)).toEqual([-46, 76]);
    expect(Array.from(engine.vx)).toEqual([-8, 17]);
    expect(Array.from(engine.vy)).toEqual([4, -4]);
  });
});
