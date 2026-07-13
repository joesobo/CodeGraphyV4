import { describe, expect, it } from 'vitest';
import { ownedLayout } from '../../../ownedPhysicsFixture';

describe('owned physics controls', () => {
  it('starts in the default running state', () => {
    expect(ownedLayout().engine.tick().steps).toBeGreaterThan(0);
  });

  it('honors explicit pause state', () => {
    const engine = ownedLayout().engine;
    engine.pause();
    expect(engine.tick().steps).toBe(0);
  });

  it('pauses and reheats without advancing while paused', () => {
    const engine = ownedLayout().engine;
    engine.pause();
    engine.reheat();
    expect(engine.settled).toBe(false);
    expect(engine.tick().steps).toBe(0);
  });

  it('resumes and reheats the graph animation', () => {
    const engine = ownedLayout().engine;
    engine.pause();
    engine.resume();
    engine.reheat();
    expect(engine.tick().steps).toBeGreaterThan(0);
  });

  it('reheats through the required owned engine contract', () => {
    const engine = ownedLayout().engine;
    expect(() => engine.reheat()).not.toThrow();
  });

  it('rejects invalid reheat alpha instead of silently hiding a broken control', () => {
    const engine = ownedLayout().engine;
    expect(() => engine.reheat(0)).toThrow('reheat alpha must be positive');
  });
});
