import {
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from 'd3-force';
import { describe, expect, it } from 'vitest';

import { createGraphLayoutEngine } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';

describe('owned graph center force', () => {
  it('matches D3 x/y centering strength', () => {
    const referenceNodes: SimulationNodeDatum[] = [
      { vx: 2, vy: -1, x: 100, y: -50 },
      { vx: -3, vy: 4, x: -200, y: 80 },
    ];
    const reference = forceSimulation(referenceNodes)
      .stop()
      .alpha(1)
      .alphaDecay(0)
      .velocityDecay(0)
      .force('x', forceX(0).strength(0.1))
      .force('y', forceY(0).strength(0.1));

    reference.tick();

    const engine = createGraphLayoutEngine({
      nodeIds: ['first', 'second'],
      initialX: Float32Array.of(100, -200),
      initialY: Float32Array.of(-50, 80),
      initialVx: Float32Array.of(2, -3),
      initialVy: Float32Array.of(-1, 4),
      radii: Float32Array.of(1, 1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      alphaDecay: 0,
      centralGravity: 0.1,
      chargeStrength: 0,
      collisionIterations: 0,
      velocityDecay: 0,
    });

    engine.tick();

    referenceNodes.forEach((node, index) => {
      expect(engine.x[index]).toBeCloseTo(node.x as number, 5);
      expect(engine.y[index]).toBeCloseTo(node.y as number, 5);
      expect(engine.vx[index]).toBeCloseTo(node.vx as number, 5);
      expect(engine.vy[index]).toBeCloseTo(node.vy as number, 5);
    });
  });
});
