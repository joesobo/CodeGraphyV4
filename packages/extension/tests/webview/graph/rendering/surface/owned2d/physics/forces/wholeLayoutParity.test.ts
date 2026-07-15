import {
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { describe, expect, it } from 'vitest';

import { createGraphLayoutEngine } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';

interface ReferenceNode extends SimulationNodeDatum {
  id: number;
}

interface ReferenceLink extends SimulationLinkDatum<ReferenceNode> {
  source: number | ReferenceNode;
  target: number | ReferenceNode;
}

describe('owned graph whole-layout D3 parity', () => {
  it('matches a 100-node linked D3 simulation trajectory', () => {
    const nodeCount = 100;
    const initialX = Float32Array.from(
      { length: nodeCount },
      (_, index) => Math.sin(index * 1.31 + 0.17) * 300 + index * 0.019,
    );
    const initialY = Float32Array.from(
      { length: nodeCount },
      (_, index) => Math.cos(index * 1.73 + 0.41) * 240 - index * 0.023,
    );
    const edgeSources: number[] = [];
    const edgeTargets: number[] = [];
    for (let index = 0; index < nodeCount; index += 1) {
      if (index + 1 < nodeCount) {
        edgeSources.push(index);
        edgeTargets.push(index + 1);
      }
      if (index + 7 < nodeCount) {
        edgeSources.push(index);
        edgeTargets.push(index + 7);
      }
    }
    const referenceNodes: ReferenceNode[] = Array.from(
      { length: nodeCount },
      (_, id) => ({ id, vx: 0, vy: 0, x: initialX[id], y: initialY[id] }),
    );
    const referenceLinks: ReferenceLink[] = edgeSources.map((source, index) => ({
      source,
      target: edgeTargets[index],
    }));
    const reference = forceSimulation(referenceNodes)
      .stop()
      .alpha(1)
      .alphaDecay(0)
      .velocityDecay(0.4)
      .force('link', forceLink<ReferenceNode, ReferenceLink>(referenceLinks)
        .id(node => node.id)
        .distance(80))
      .force('charge', forceManyBody<ReferenceNode>().strength(-30).distanceMin(1).theta(0))
      .force('x', forceX<ReferenceNode>(0).strength(0.1))
      .force('y', forceY<ReferenceNode>(0).strength(0.1));
    const engine = createGraphLayoutEngine({
      nodeIds: Array.from({ length: nodeCount }, (_, index) => `node-${index}`),
      initialX,
      initialY,
      radii: new Float32Array(nodeCount).fill(1),
      edgeSources: Uint32Array.from(edgeSources),
      edgeTargets: Uint32Array.from(edgeTargets),
    }, {
      alphaDecay: 0,
      centralGravity: 0.1,
      chargeStrength: -30,
      collisionIterations: 0,
      linkDistance: 80,
      linkStrength: 1,
      velocityDecay: 0.4,
    });

    for (let tick = 0; tick < 5; tick += 1) {
      reference.tick();
      engine.tick();
    }

    let squaredError = 0;
    let maximumError = 0;
    referenceNodes.forEach((node, index) => {
      const error = Math.hypot(
        engine.x[index] - (node.x as number),
        engine.y[index] - (node.y as number),
      );
      squaredError += error * error;
      maximumError = Math.max(maximumError, error);
    });
    expect(Math.sqrt(squaredError / nodeCount)).toBeLessThan(0.01);
    expect(maximumError).toBeLessThan(0.05);
  });
});
