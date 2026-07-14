import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import type { OwnedGraphLayout } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import { createGraphLayoutEngine, GraphNodeFlag } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';
import { updateOwnedGraphViewportNode } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/viewportNode';

function fixture(): { layout: OwnedGraphLayout; node: FGNode } {
  const node = { id: 'plugin-node', x: 0, y: 0, vx: 0, vy: 0 } as FGNode;
  return {
    node,
    layout: {
      engine: createGraphLayoutEngine({
        nodeIds: [node.id],
        initialX: Float32Array.of(0),
        initialY: Float32Array.of(0),
        radii: Float32Array.of(4),
        edgeSources: new Uint32Array(),
        edgeTargets: new Uint32Array(),
      }),
      links: [],
      nodes: [node],
    },
  };
}

describe('owned graph plugin viewport node updates', () => {
  it('synchronizes kinematics and gives explicit unpinning precedence over fixed coordinates', () => {
    const { layout, node } = fixture();

    expect(updateOwnedGraphViewportNode(layout, node.id, {
      fx: 30,
      fy: 40,
      isPinned: true,
      vx: 2,
      vy: 3,
      x: 20,
      y: 25,
    })).toBe(true);
    expect([layout.engine.x[0], layout.engine.y[0]]).toEqual([30, 40]);
    expect([layout.engine.vx[0], layout.engine.vy[0]]).toEqual([0, 0]);
    expect(layout.engine.flags[0] & GraphNodeFlag.Pinned).toBe(GraphNodeFlag.Pinned);

    expect(updateOwnedGraphViewportNode(layout, node.id, { isPinned: false })).toBe(true);
    expect(node).toMatchObject({ fx: undefined, fy: undefined, isPinned: false });
    expect(layout.engine.flags[0] & GraphNodeFlag.Pinned).toBe(0);
    expect(updateOwnedGraphViewportNode(layout, 'missing', { x: 1 })).toBe(false);
  });
});
