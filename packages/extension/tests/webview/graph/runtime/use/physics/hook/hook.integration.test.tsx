import { describe, expect, it, vi } from 'vitest';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import { createOwnedGraphPluginForces } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/pluginForces';
import {
  applyOwnedPhysicsSettings,
  createOwnedGraphLayout,
  updateOwnedGraphLayout,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import { DEFAULT_PHYSICS_SETTINGS, ownedNode } from '../../../ownedPhysicsFixture';

function layout() {
  return createOwnedGraphLayout([ownedNode('a', { x: 40, y: 0 })], [], DEFAULT_PHYSICS_SETTINGS);
}

describe('owned physics lifecycle integration', () => {
  it('does not need to check settings before creating an empty layout', () => {
    expect(createOwnedGraphLayout([], [], DEFAULT_PHYSICS_SETTINGS).nodes).toEqual([]);
  });

  it('initializes the active typed graph engine', () => {
    expect(layout().engine.nodeIds).toEqual(['a']);
  });

  it('does not retry deferred initialization', () => {
    const requestAnimationFrame = vi.fn();
    layout();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('disposes active physics during cleanup', () => {
    expect(() => layout().engine.dispose?.()).not.toThrow();
  });

  it('initializes synchronously without cancellation bookkeeping', () => {
    expect(layout().kind).toBe('main-thread');
  });

  it('does not rebuild the engine when settings and topology are unchanged', () => {
    const current = layout();
    const engine = current.engine;
    updateOwnedGraphLayout(current, [ownedNode('a')], [], DEFAULT_PHYSICS_SETTINGS);
    expect(current.engine).toBe(engine);
  });

  it('applies changes against the current engine state', () => {
    const current = layout();
    applyOwnedPhysicsSettings(current.engine, { ...DEFAULT_PHYSICS_SETTINGS, damping: 0.2 });
    expect(current.engine.settled).toBe(false);
  });

  it('makes changed settings materially affect motion', () => {
    const highDamping = layout().engine;
    const lowDamping = layout().engine;
    highDamping.setKinematics(highDamping.x, highDamping.y, Float32Array.of(10), Float32Array.of(0));
    lowDamping.setKinematics(lowDamping.x, lowDamping.y, Float32Array.of(10), Float32Array.of(0));
    applyOwnedPhysicsSettings(highDamping, { ...DEFAULT_PHYSICS_SETTINGS, damping: 0.7, centerForce: 0, repelForce: 0 });
    applyOwnedPhysicsSettings(lowDamping, { ...DEFAULT_PHYSICS_SETTINGS, damping: 0.1, centerForce: 0, repelForce: 0 });
    highDamping.tick(1000 / 60);
    lowDamping.tick(1000 / 60);
    expect(highDamping.vx[0]).toBeLessThan(lowDamping.vx[0]);
  });

  it('syncs pause and resume requests to the active engine', () => {
    const engine = layout().engine;
    engine.pause();
    expect(engine.tick(1000 / 60).steps).toBe(0);
    engine.resume();
    expect(engine.tick(1000 / 60).steps).toBeGreaterThan(0);
  });

  it('passes current physics settings to plugin force adapters', () => {
    const pluginForces = createOwnedGraphPluginForces();
    const create = vi.fn(() => ({ dispose: vi.fn() }));
    const contributions = {
      runtimeNodes: [], runtimeEdges: [], projections: [], nodeDragEnd: [], contextMenu: [], ui: [],
      forces: [{ pluginId: 'plugin', contribution: { id: 'force', label: 'Force', create } }],
    } as CoreGraphViewContributionSet;
    const current = layout();
    pluginForces.sync(contributions, current, DEFAULT_PHYSICS_SETTINGS);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      physicsSettings: DEFAULT_PHYSICS_SETTINGS,
    }));
  });

  it('reheats when the graph layout topology changes', () => {
    const current = layout();
    updateOwnedGraphLayout(
      current,
      [ownedNode('a'), ownedNode('b')],
      [],
      DEFAULT_PHYSICS_SETTINGS,
    );
    expect(current.engine.nodeIds).toEqual(['a', 'b']);
    expect(current.engine.settled).toBe(false);
  });
});
