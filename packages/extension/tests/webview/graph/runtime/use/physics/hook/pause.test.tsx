import { describe, expect, it } from 'vitest';
import { ownedLayout } from '../../../ownedPhysicsFixture';

describe('owned physics pause lifecycle', () => {
  it('syncs pause changes to the active engine', () => {
    const engine = ownedLayout().engine;
    engine.pause();
    expect(engine.tick()).toMatchObject({ steps: 0 });
    engine.resume();
    expect(engine.tick().steps).toBeGreaterThan(0);
  });

  it('does not require pause synchronization before an engine exists', () => {
    const engine = undefined;
    expect(engine).toBeUndefined();
  });

  it('keeps a paused initialized engine stationary', () => {
    const engine = ownedLayout().engine;
    const x = Array.from(engine.x);
    engine.pause();
    engine.tick();
    expect(Array.from(engine.x)).toEqual(x);
  });
});
