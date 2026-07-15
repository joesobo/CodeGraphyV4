import { describe, expect, it } from 'vitest';
import {
  adjacency,
  createFixtureEngine,
  FEEL_TEST_TIMEOUT_MS,
  SETTLEMENT_TICKS,
} from './fixture';

describe('500-node graph physics', () => {
  it('keeps a high-degree hub stable while a connected leaf is dragged', { timeout: FEEL_TEST_TIMEOUT_MS }, () => {
    const engine = createFixtureEngine();
    for (let tick = 0; tick < SETTLEMENT_TICKS; tick += 1) engine.tick();
    const neighbors = adjacency(engine);
    let hub = 0;
    for (let index = 1; index < neighbors.length; index += 1) {
      if (neighbors[index].size > neighbors[hub].size) hub = index;
    }
    const leaf = [...neighbors[hub]].reduce((candidate, index) => (
      neighbors[index].size < neighbors[candidate].size ? index : candidate
    ));
    const initialHubX = engine.x[hub];
    const initialHubY = engine.y[hub];
    engine.pin(leaf);
    engine.setNodePosition(leaf, engine.x[leaf] + 120, engine.y[leaf]);
    engine.setAlphaTarget(0.3);
    for (let tick = 0; tick < 12; tick += 1) engine.tick();
    expect(Math.hypot(engine.x[hub] - initialHubX, engine.y[hub] - initialHubY) / 120)
      .toBeLessThanOrEqual(0.35);
  });
});
