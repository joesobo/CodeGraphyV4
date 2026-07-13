import { describe, expect, it } from 'vitest';

import {
  createFixtureEngine,
  FEEL_TEST_TIMEOUT_MS,
  nearestPackagePurity,
  packageSeparationRatio,
  SETTLEMENT_TICKS,
} from './ownedPhysicsFixture';

describe('500-node owned physics feel', () => {
  it('settles topology-local relationships into visible package clusters', { timeout: FEEL_TEST_TIMEOUT_MS }, () => {
    const engine = createFixtureEngine();

    for (let tick = 0; tick < SETTLEMENT_TICKS; tick += 1) engine.tick();

    expect(engine.settled).toBe(true);
    expect(nearestPackagePurity(engine.x, engine.y)).toBeGreaterThanOrEqual(0.7);
    expect(packageSeparationRatio(engine.x, engine.y)).toBeGreaterThanOrEqual(1.2);
  });
});
