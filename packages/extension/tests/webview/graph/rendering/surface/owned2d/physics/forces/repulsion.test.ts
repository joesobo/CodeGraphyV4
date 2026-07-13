import {
  forceManyBody,
  forceSimulation,
  type SimulationNodeDatum,
} from 'd3-force';
import { describe, expect, it, vi } from 'vitest';

import {
  createGraphLayoutEngine,
  DEFAULT_GRAPH_LAYOUT_CONFIG,
} from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';
import { FlatBarnesHutTree } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/forces/barnesHut';
import {
  applyRepulsionForces,
  resolveRepulsionTheta,
} from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/forces/repulsion';

interface ReferenceNode extends SimulationNodeDatum {
  id: number;
}

function compareBarnesHutLayout(nodeCount: number, tickCount: number) {
  const initialX = Float32Array.from(
    { length: nodeCount },
    (_, index) => Math.sin(index * 1.7 + 0.31) * 350 + index * 0.037,
  );
  const initialY = Float32Array.from(
    { length: nodeCount },
    (_, index) => Math.cos(index * 2.3 + 0.73) * 280 - index * 0.021,
  );
  const multipliers = Float32Array.from(
    { length: nodeCount },
    (_, index) => 0.5 + (index % 5) * 0.25,
  );
  const referenceNodes: ReferenceNode[] = Array.from(
    { length: nodeCount },
    (_, id) => ({ id, vx: 0, vy: 0, x: initialX[id], y: initialY[id] }),
  );
  const theta = resolveRepulsionTheta(nodeCount, DEFAULT_GRAPH_LAYOUT_CONFIG.chargeTheta);
  const reference = forceSimulation(referenceNodes)
    .stop()
    .alpha(1)
    .alphaDecay(0)
    .velocityDecay(0)
    .force('charge', forceManyBody<ReferenceNode>()
      .strength((_node, index) => -30 * multipliers[index])
      .distanceMin(1)
      .distanceMax(400)
      .theta(theta));
  const engine = createGraphLayoutEngine({
    nodeIds: Array.from({ length: nodeCount }, (_, index) => `node-${index}`),
    initialX,
    initialY,
    chargeStrengthMultipliers: multipliers,
    radii: new Float32Array(nodeCount).fill(1),
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
  }, {
    alphaDecay: 0,
    centralGravity: 0,
    chargeDistanceMax: 400,
    chargeDistanceMin: 1,
    chargeStrength: -30,
    chargeTheta: 0.9,
    collisionIterations: 0,
    velocityDecay: 0,
  });

  for (let tick = 0; tick < tickCount; tick += 1) {
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
  return { maximumError, rmsError: Math.sqrt(squaredError / nodeCount) };
}

function deterministicBarnesHutTrajectory(): { x: Float32Array; y: Float32Array } {
  const nodeCount = 1_000;
  const engine = createGraphLayoutEngine({
    nodeIds: Array.from({ length: nodeCount }, (_, index) => `node-${index}`),
    initialX: Float32Array.from(
      { length: nodeCount },
      (_, index) => Math.sin(index * 1.7 + 0.31) * 350 + index * 0.037,
    ),
    initialY: Float32Array.from(
      { length: nodeCount },
      (_, index) => Math.cos(index * 2.3 + 0.73) * 280 - index * 0.021,
    ),
    radii: new Float32Array(nodeCount).fill(1),
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
  }, {
    centralGravity: 0,
    chargeStrength: -30,
    collisionIterations: 0,
  });
  for (let tick = 0; tick < 10; tick += 1) engine.tick();
  return { x: new Float32Array(engine.x), y: new Float32Array(engine.y) };
}

describe('owned graph many-body force', () => {
  it('preserves exact 500-node charge and transitions smoothly to D3 theta by 1,000', () => {
    const theta = DEFAULT_GRAPH_LAYOUT_CONFIG.chargeTheta;
    expect(resolveRepulsionTheta(500, theta)).toBe(0);
    expect(resolveRepulsionTheta(501, theta)).toBeCloseTo(0.0018);
    expect(resolveRepulsionTheta(750, theta)).toBe(0.45);
    expect(resolveRepulsionTheta(1_000, theta)).toBe(0.9);
  });

  it('does not build a tree when global repulsion is disabled', () => {
    const state = {
      chargeStrengthMultipliers: Float32Array.of(1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
      flags: new Uint8Array(1),
      linkDegrees: new Uint32Array(1),
      radii: Float32Array.of(1),
      targetX: Float32Array.of(Number.NaN),
      targetY: Float32Array.of(Number.NaN),
      vx: Float32Array.of(0),
      vy: Float32Array.of(0),
      x: Float32Array.of(0),
      y: Float32Array.of(0),
    };
    const tree = new FlatBarnesHutTree();
    const rebuild = vi.spyOn(tree, 'rebuild');

    applyRepulsionForces(tree, state, {
      ...DEFAULT_GRAPH_LAYOUT_CONFIG,
      chargeStrength: 0,
    }, 1);

    expect(rebuild).not.toHaveBeenCalled();
  });

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
      chargeTheta: 0,
    });

    engine.tick();

    referenceNodes.forEach((node, index) => {
      expect(engine.x[index]).toBeCloseTo(node.x as number, 4);
      expect(engine.vx[index]).toBeCloseTo(node.vx as number, 4);
    });
  });

  it('matches D3 minimum and maximum charge distances', () => {
    const initialX = Float32Array.of(0, 0.25, 100);
    const initialY = Float32Array.of(0, 0.125, 20);
    const referenceNodes: ReferenceNode[] = Array.from({ length: 3 }, (_, id) => ({
      id,
      vx: 0,
      vy: 0,
      x: initialX[id],
      y: initialY[id],
    }));
    const reference = forceSimulation(referenceNodes)
      .stop()
      .alpha(1)
      .alphaDecay(0)
      .velocityDecay(0)
      .force('charge', forceManyBody().strength(-30)
        .distanceMin(2)
        .distanceMax(50)
        .theta(0));
    const engine = createGraphLayoutEngine({
      nodeIds: ['near-a', 'near-b', 'far'],
      initialX,
      initialY,
      radii: Float32Array.of(1, 1, 1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      alphaDecay: 0,
      centralGravity: 0,
      chargeDistanceMax: 50,
      chargeDistanceMin: 2,
      chargeStrength: -30,
      chargeTheta: 0,
      collisionIterations: 0,
      velocityDecay: 0,
    });

    reference.tick();
    engine.tick();

    referenceNodes.forEach((node, index) => {
      expect(engine.x[index]).toBeCloseTo(node.x as number, 5);
      expect(engine.y[index]).toBeCloseTo(node.y as number, 5);
    });
  });

  it('matches a whole 100-node D3 charge layout with source multipliers', () => {
    const comparison = compareBarnesHutLayout(100, 5);

    expect(comparison.rmsError).toBeLessThan(0.01);
    expect(comparison.maximumError).toBeLessThan(0.05);
  });

  it('matches a 1,000-node D3 Barnes-Hut force step', () => {
    const comparison = compareBarnesHutLayout(1_000, 1);

    expect(comparison.rmsError).toBeLessThan(0.01);
    expect(comparison.maximumError).toBeLessThan(0.05);
  });

  it('produces byte-identical multi-tick Barnes-Hut trajectories', () => {
    const first = deterministicBarnesHutTrajectory();
    const second = deterministicBarnesHutTrajectory();

    expect(first.x).toEqual(second.x);
    expect(first.y).toEqual(second.y);
  });
});
