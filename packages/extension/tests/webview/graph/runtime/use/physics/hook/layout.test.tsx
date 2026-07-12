import { describe, expect, it } from 'vitest';
import { updateOwnedGraphLayout } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import { DEFAULT_PHYSICS_SETTINGS, ownedLayout, ownedNode } from '../../../ownedPhysicsFixture';

describe('owned physics layout updates', () => {
  it('reheats when the topology changes', () => {
    const layout = ownedLayout();
    const nodes = [ownedNode('a'), ownedNode('b')];
    updateOwnedGraphLayout(layout, nodes, [], DEFAULT_PHYSICS_SETTINGS);
    expect(layout.engine.nodeIds).toEqual(['a', 'b']);
    expect(layout.engine.settled).toBe(false);
  });

  it('updates a running layout without pausing it', () => {
    const layout = ownedLayout();
    updateOwnedGraphLayout(layout, [ownedNode('a', { color: '#f00' })], [], DEFAULT_PHYSICS_SETTINGS);
    expect(layout.engine.tick(1000 / 60).steps).toBeGreaterThan(0);
  });

  it('captures the initial layout without an extra engine', () => {
    const layout = ownedLayout();
    expect(layout.engine.nodeIds).toEqual(layout.nodes.map(node => node.id));
  });

  it('does not rebuild physics for metadata-only updates', () => {
    const layout = ownedLayout();
    const engine = layout.engine;
    updateOwnedGraphLayout(layout, [ownedNode('a', { color: '#f00' })], [], DEFAULT_PHYSICS_SETTINGS);
    expect(layout.engine).toBe(engine);
  });

  it('preserves node positions while applying topology updates', () => {
    const layout = ownedLayout([ownedNode('a', { x: 30, y: 40 })]);
    updateOwnedGraphLayout(
      layout,
      [ownedNode('a'), ownedNode('b', { x: 50, y: 60 })],
      [],
      DEFAULT_PHYSICS_SETTINGS,
    );
    expect(Array.from(layout.engine.x)).toEqual([30, 50]);
    expect(Array.from(layout.engine.y)).toEqual([40, 60]);
  });
});
