import { describe, expect, it, vi } from 'vitest';
import type { FGNode } from '../../../../../../../../src/webview/components/graph/model/build';
import type { OwnedGraphLayout } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout/runtime/model';
import { createGraphLayoutEngine, GraphNodeFlag } from '@codegraphy-dev/graph-renderer';
import { updateOwnedGraphViewportNode } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/picking/viewport/model';

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
  it('synchronizes authoritative kinematics and gives explicit unpinning precedence', () => {
    const { layout, node } = fixture();
    const { x, y, vx, vy } = layout.engine;
    const setKinematics = vi.spyOn(layout.engine, 'setKinematics');

    expect(updateOwnedGraphViewportNode(layout, node.id, {
      fx: 30,
      fy: 40,
      isPinned: true,
      vx: 2,
      vy: 3,
      x: 20,
      y: 25,
    })).toBe(true);
    expect(setKinematics).toHaveBeenLastCalledWith(x, y, vx, vy);
    expect([layout.engine.x[0], layout.engine.y[0]]).toEqual([30, 40]);
    expect([layout.engine.vx[0], layout.engine.vy[0]]).toEqual([0, 0]);
    expect(layout.engine.flags[0] & GraphNodeFlag.Pinned).toBe(GraphNodeFlag.Pinned);

    expect(updateOwnedGraphViewportNode(layout, node.id, { isPinned: false })).toBe(true);
    expect(node).toMatchObject({ fx: undefined, fy: undefined, isPinned: false });
    expect(layout.engine.flags[0] & GraphNodeFlag.Pinned).toBe(0);
    expect(updateOwnedGraphViewportNode(layout, 'missing', { x: 1 })).toBe(false);
  });
});
