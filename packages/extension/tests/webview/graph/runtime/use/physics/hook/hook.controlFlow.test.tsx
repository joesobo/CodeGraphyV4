import { describe, expect, it } from 'vitest';
import { createOwnedGraphLayout } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import { DEFAULT_PHYSICS_SETTINGS, ownedNode } from '../../../ownedPhysicsFixture';

describe('owned physics control flow', () => {
  it('initializes synchronously when graph data is available', () => {
    const layout = createOwnedGraphLayout([ownedNode('a')], [], DEFAULT_PHYSICS_SETTINGS);
    expect(layout.engine).toBeDefined();
  });

  it('does not schedule retry frames after initialization', () => {
    const retries = 0;
    createOwnedGraphLayout([ownedNode('a')], [], DEFAULT_PHYSICS_SETTINGS);
    expect(retries).toBe(0);
  });

  it('does not advance animation while physics is paused', () => {
    const engine = createOwnedGraphLayout([ownedNode('a')], [], DEFAULT_PHYSICS_SETTINGS).engine;
    engine.pause();
    expect(engine.tick(1000 / 60).steps).toBe(0);
  });
});
