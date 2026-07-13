import { describe, expect, it } from 'vitest';
import { applyOwnedPhysicsSettings, toOwnedPhysicsConfig } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import { DEFAULT_PHYSICS_SETTINGS, ownedLayout } from '../../../ownedPhysicsFixture';

describe('owned physics setting updates', () => {
  it('applies updated settings when the active engine is ready', () => {
    const engine = ownedLayout().engine;
    applyOwnedPhysicsSettings(engine, { ...DEFAULT_PHYSICS_SETTINGS, damping: 0.2 });
    expect(engine.settled).toBe(false);
  });

  it('normalizes invalid settings before they reach the active engine', () => {
    expect(toOwnedPhysicsConfig({
      ...DEFAULT_PHYSICS_SETTINGS,
      damping: Number.NaN,
    }).velocityDecay).toBe(0.4);
  });

  it('maps changed settings without retaining a stale settings snapshot', () => {
    expect(toOwnedPhysicsConfig({ ...DEFAULT_PHYSICS_SETTINGS, linkDistance: 150 }).linkDistance)
      .toBe(150);
  });
});
