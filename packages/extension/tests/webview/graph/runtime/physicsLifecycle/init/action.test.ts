import { describe, expect, it } from 'vitest';
import {
  applyOwnedPhysicsSettings,
  createOwnedGraphLayout,
  toOwnedPhysicsConfig,
  updateOwnedGraphLayout,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import { DEFAULT_PHYSICS_SETTINGS, ownedLayout, ownedNode } from '../../ownedPhysicsFixture';

describe('owned physics lifecycle actions', () => {
  it('treats a graph as ready as soon as its owned layout exists', () => {
    expect(ownedLayout().engine.nodeIds).toEqual(['a']);
  });

  it('does not need a settings comparison before layout initialization', () => {
    const layout = createOwnedGraphLayout([ownedNode('a')], [], DEFAULT_PHYSICS_SETTINGS);
    expect(layout.engine.settled).toBe(false);
  });

  it('does not apply settings when a graph layout is missing', () => {
    const apply = () => undefined;
    expect(apply()).toBeUndefined();
  });

  it('maps updates only from the current persisted settings', () => {
    expect(toOwnedPhysicsConfig({ ...DEFAULT_PHYSICS_SETTINGS, damping: 0.4 }).velocityDecay)
      .toBe(0.4);
  });

  it('updates an existing layout instead of initializing a parallel physics engine', () => {
    const layout = ownedLayout();
    const engine = layout.engine;
    expect(updateOwnedGraphLayout(
      layout,
      [ownedNode('a', { color: '#f00' })],
      [],
      DEFAULT_PHYSICS_SETTINGS,
    )).toBe(true);
    expect(layout.engine).toBe(engine);
  });

  it('waits for graph data before creating node state', () => {
    const layout = createOwnedGraphLayout([], [], DEFAULT_PHYSICS_SETTINGS);
    expect(layout.engine.nodeIds).toEqual([]);
    expect(layout.engine.settled).toBe(false);
    layout.engine.tick();
    expect(layout.engine.settled).toBe(true);
  });

  it('reheats the owned engine when physics settings change', () => {
    const layout = ownedLayout();
    for (let tick = 0; tick < 320; tick += 1) layout.engine.tick();
    expect(layout.engine.settled).toBe(true);
    applyOwnedPhysicsSettings(layout.engine, { ...DEFAULT_PHYSICS_SETTINGS, damping: 0.4 });
    expect(layout.engine.settled).toBe(false);
  });
});
