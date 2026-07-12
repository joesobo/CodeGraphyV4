import { describe, expect, it } from 'vitest';
import { createOwnedGraphLayout } from '../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import { DEFAULT_PHYSICS_SETTINGS, ownedLayout, ownedNode } from '../ownedPhysicsFixture';

describe('owned physics initialization', () => {
  it('keeps one initialized engine for metadata-only graph updates', () => {
    const layout = ownedLayout();
    expect(layout.engine).toBe(layout.engine);
  });

  it('supports an empty graph before graph data is available', () => {
    const layout = createOwnedGraphLayout([], [], DEFAULT_PHYSICS_SETTINGS);
    expect(layout.nodes).toEqual([]);
  });

  it('initializes typed node buffers as soon as graph data is available', () => {
    const layout = createOwnedGraphLayout([ownedNode('a'), ownedNode('b')], [], DEFAULT_PHYSICS_SETTINGS);
    expect(layout.engine.x).toHaveLength(2);
    expect(layout.engine.y).toHaveLength(2);
  });
});
