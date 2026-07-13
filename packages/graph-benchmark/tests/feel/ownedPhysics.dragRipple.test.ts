import { describe, expect, it } from 'vitest';

import {
  adjacency,
  createFixtureEngine,
  FEEL_TEST_TIMEOUT_MS,
  meanDisplacement,
  SETTLEMENT_TICKS,
} from './ownedPhysicsFixture';

describe('500-node owned physics feel', () => {
  it('ripples a hub drag through nearby relationships and settles after release', { timeout: FEEL_TEST_TIMEOUT_MS }, () => {
    const engine = createFixtureEngine();
    for (let tick = 0; tick < SETTLEMENT_TICKS; tick += 1) engine.tick();
    const neighbors = adjacency(engine);
    let hub = 0;
    for (let index = 1; index < neighbors.length; index += 1) {
      if (neighbors[index].size > neighbors[hub].size) hub = index;
    }
    const oneHop = neighbors[hub];
    const twoHop = new Set<number>();
    for (const neighbor of oneHop) {
      for (const candidate of neighbors[neighbor]) {
        if (candidate !== hub && !oneHop.has(candidate)) twoHop.add(candidate);
      }
    }
    const initialX = new Float32Array(engine.x);
    const initialY = new Float32Array(engine.y);

    engine.pin(hub);
    engine.setNodePosition(hub, engine.x[hub] + 120, engine.y[hub]);
    engine.setAlphaTarget(0.3);
    engine.tick();
    engine.tick();

    const oneHopDisplacement = meanDisplacement(oneHop, engine, initialX, initialY);
    const twoHopDisplacement = meanDisplacement(twoHop, engine, initialX, initialY);
    expect(oneHopDisplacement).toBeGreaterThan(0.1);
    expect(twoHopDisplacement / oneHopDisplacement).toBeLessThanOrEqual(0.75);

    engine.release(hub);
    engine.setAlphaTarget(0);
    let releaseTicks = 0;
    while (!engine.settled && releaseTicks < 180) {
      engine.tick();
      releaseTicks += 1;
    }
    expect(engine.settled).toBe(true);
    expect(releaseTicks).toBeGreaterThanOrEqual(30);
  });
});
