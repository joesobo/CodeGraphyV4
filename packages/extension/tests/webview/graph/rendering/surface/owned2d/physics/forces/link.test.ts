import {
  forceLink,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { describe, expect, it } from 'vitest';

import { createGraphLayoutEngine } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';

interface ReferenceNode extends SimulationNodeDatum {
  id: number;
}

describe('owned graph link force', () => {
  it('matches D3 degree bias, default strength, and predicted-position impulses', () => {
    const initialX = [0, 100, 200];
    const initialVx = [4, -2, 1];
    const referenceNodes: ReferenceNode[] = initialX.map((x, index) => ({
      id: index,
      vx: initialVx[index],
      vy: 0,
      x,
      y: 0,
    }));
    const referenceLinks: SimulationLinkDatum<ReferenceNode>[] = [
      { source: 0, target: 1 },
      { source: 0, target: 2 },
    ];
    const reference = forceSimulation(referenceNodes)
      .stop()
      .alpha(1)
      .alphaDecay(0)
      .velocityDecay(0)
      .force(
        'link',
        forceLink<ReferenceNode, SimulationLinkDatum<ReferenceNode>>(referenceLinks)
          .id(node => node.id)
          .distance(50),
      );

    reference.tick();

    const engine = createGraphLayoutEngine({
      nodeIds: ['hub', 'leaf-a', 'leaf-b'],
      initialX: Float32Array.from(initialX),
      initialY: Float32Array.of(0, 0, 0),
      initialVx: Float32Array.from(initialVx),
      initialVy: Float32Array.of(0, 0, 0),
      radii: Float32Array.of(1, 1, 1),
      edgeSources: Uint32Array.of(0, 0),
      edgeTargets: Uint32Array.of(1, 2),
    }, {
      alphaDecay: 0,
      centralGravity: 0,
      collisionIterations: 0,
      velocityDecay: 0,
      chargeStrength: 0,
      linkStrength: 1,
      linkDistance: 50,
    });

    engine.tick(1000 / 60);

    referenceNodes.forEach((node, index) => {
      expect(engine.x[index]).toBeCloseTo(node.x as number, 5);
      expect(engine.vx[index]).toBeCloseTo(node.vx as number, 5);
    });
  });
});
