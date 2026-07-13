import {
  forceManyBody,
  forceSimulation,
  type SimulationNodeDatum,
} from 'd3-force';
import { describe, expect, it } from 'vitest';

import { createGraphLayoutEngine } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';

interface ReferenceNode extends SimulationNodeDatum {
  id: number;
}

describe('owned graph many-body force', () => {
  it('matches exact D3 charge impulses across the graph', () => {
    const initialX = [0, 100, 250];
    const referenceNodes: ReferenceNode[] = initialX.map((x, id) => ({
      id,
      vx: 0,
      vy: 0,
      x,
      y: 0,
    }));
    const reference = forceSimulation(referenceNodes)
      .stop()
      .alpha(1)
      .alphaDecay(0)
      .velocityDecay(0)
      .force('charge', forceManyBody().strength(-30).distanceMin(1).theta(0));

    reference.tick();

    const engine = createGraphLayoutEngine({
      nodeIds: ['left', 'middle', 'right'],
      initialX: Float32Array.from(initialX),
      initialY: Float32Array.of(0, 0, 0),
      radii: Float32Array.of(1, 1, 1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      alphaDecay: 0,
      centralGravity: 0,
      collisionIterations: 0,
      velocityDecay: 0,
      chargeStrength: -30,
    });

    engine.tick(1000 / 60);

    referenceNodes.forEach((node, index) => {
      expect(engine.x[index]).toBeCloseTo(node.x as number, 4);
      expect(engine.vx[index]).toBeCloseTo(node.vx as number, 4);
    });
  });
});
