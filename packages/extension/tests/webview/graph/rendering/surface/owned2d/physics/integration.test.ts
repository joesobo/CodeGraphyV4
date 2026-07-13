import { forceSimulation, type SimulationNodeDatum } from 'd3-force';
import { describe, expect, it } from 'vitest';

import { createGraphLayoutEngine } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';

describe('owned graph integration', () => {
  it('matches D3 velocity decay and position integration', () => {
    const referenceNodes: SimulationNodeDatum[] = [
      { vx: 10, vy: -5, x: 20, y: 40 },
      { vx: -4, vy: 8, x: -30, y: 10 },
    ];
    const reference = forceSimulation(referenceNodes)
      .stop()
      .alpha(1)
      .alphaDecay(0)
      .velocityDecay(0.4);

    reference.tick();

    const engine = createGraphLayoutEngine({
      nodeIds: ['first', 'second'],
      initialX: Float32Array.of(20, -30),
      initialY: Float32Array.of(40, 10),
      initialVx: Float32Array.of(10, -4),
      initialVy: Float32Array.of(-5, 8),
      radii: Float32Array.of(1, 1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      alphaDecay: 0,
      centralGravity: 0,
      chargeStrength: 0,
      collisionIterations: 0,
      velocityDecay: 0.4,
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
