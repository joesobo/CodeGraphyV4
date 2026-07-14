import { describe, expect, it } from 'vitest';
import { GraphNodeFlag } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';
import type { GraphLayoutState } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/contracts';
import { updateVisibleLinkDegrees } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/linkDegrees';

function state(): GraphLayoutState {
  return {
    chargeStrengthMultipliers: Float32Array.of(1, 1, 1),
    edgeSources: Uint32Array.of(0, 0),
    edgeTargets: Uint32Array.of(1, 2),
    flags: new Uint8Array(3),
    linkDegrees: new Uint32Array(3),
    radii: Float32Array.of(1, 1, 1),
    vx: new Float32Array(3),
    vy: new Float32Array(3),
    x: new Float32Array(3),
    y: new Float32Array(3),
  };
}

describe('visible link degrees', () => {
  it('counts visible topology and refreshes when a node becomes hidden', () => {
    const graph = state();
    updateVisibleLinkDegrees(graph);
    expect(Array.from(graph.linkDegrees)).toEqual([2, 1, 1]);

    graph.flags[1] |= GraphNodeFlag.Hidden;
    updateVisibleLinkDegrees(graph);
    expect(Array.from(graph.linkDegrees)).toEqual([1, 0, 1]);
  });
});
