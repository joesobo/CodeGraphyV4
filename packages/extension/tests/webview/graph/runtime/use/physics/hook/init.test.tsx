import { describe, expect, it } from 'vitest';
import { createOwnedGraphLayout } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import { DEFAULT_PHYSICS_SETTINGS, ownedNode } from '../../../ownedPhysicsFixture';

describe('owned physics initialization', () => {
  it('initializes immediately with current physics settings', () => {
    const layout = createOwnedGraphLayout([ownedNode('a')], [], DEFAULT_PHYSICS_SETTINGS);
    expect(layout.engine.nodeIds).toEqual(['a']);
  });

  it('supports an empty graph without scheduling initialization retries', () => {
    const layout = createOwnedGraphLayout([], [], DEFAULT_PHYSICS_SETTINGS);
    expect(layout.engine.nodeIds).toEqual([]);
  });

  it('disposes the initialized engine during cleanup', () => {
    const layout = createOwnedGraphLayout([ownedNode('a')], [], DEFAULT_PHYSICS_SETTINGS);
    expect(() => layout.engine.dispose?.()).not.toThrow();
  });
});
