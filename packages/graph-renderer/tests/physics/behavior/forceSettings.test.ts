import { describe, expect, it } from 'vitest';
import { createFixtureEngine, FEEL_TEST_TIMEOUT_MS, maximumSpeed } from './fixture';

describe('500-node graph physics', () => {
  it('applies force-setting changes without an explosive pulse', { timeout: FEEL_TEST_TIMEOUT_MS }, () => {
    const engine = createFixtureEngine();
    const changes: Array<{ config: Parameters<typeof engine.setConfig>[0]; tick: number }> = [
      { config: { chargeStrength: -50 }, tick: 120 },
      { config: { centralGravity: 0.2 }, tick: 240 },
      { config: { linkDistance: 120 }, tick: 360 },
      { config: { linkStrength: 0.8 }, tick: 480 },
    ];
    let currentTick = 0;
    for (const change of changes) {
      while (currentTick < change.tick) {
        engine.tick();
        currentTick += 1;
      }
      engine.setConfig(change.config);
      engine.tick();
      currentTick += 1;
      expect(maximumSpeed(engine)).toBeGreaterThan(0.1);
      expect(maximumSpeed(engine)).toBeLessThanOrEqual(30);
    }
  });
});
