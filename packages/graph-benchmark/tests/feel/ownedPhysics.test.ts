import { describe, expect, it } from 'vitest';

import { createGraphLayoutEngine } from '../../../extension/src/webview/components/graph/rendering/surface/owned2d/physics/engine';
import { generateSyntheticGraph } from '../../src/fixture/generate';

const NODE_COUNT = 500;
const PACKAGE_SIZE = 128;
const SETTLEMENT_TICKS = 310;

function createFixtureEngine() {
  const graph = generateSyntheticGraph({ nodeCount: NODE_COUNT, seed: 307 });
  const indexes = new Map(graph.nodes.map((node, index) => [node.id, index]));
  return createGraphLayoutEngine({
    nodeIds: graph.nodes.map(node => node.id),
    radii: new Float32Array(NODE_COUNT).fill(4),
    edgeSources: Uint32Array.from(graph.edges.map(edge => indexes.get(edge.from) as number)),
    edgeTargets: Uint32Array.from(graph.edges.map(edge => indexes.get(edge.to) as number)),
  });
}

function nearestPackagePurity(x: Float32Array, y: Float32Array): number {
  let matchingPackages = 0;
  let neighborCount = 0;
  for (let index = 0; index < x.length; index += 1) {
    const neighbors: Array<{ distance: number; index: number }> = [];
    for (let other = 0; other < x.length; other += 1) {
      if (other === index) continue;
      neighbors.push({
        distance: Math.hypot(x[other] - x[index], y[other] - y[index]),
        index: other,
      });
    }
    neighbors.sort((first, second) => first.distance - second.distance);
    for (const neighbor of neighbors.slice(0, 10)) {
      matchingPackages += Math.floor(index / PACKAGE_SIZE)
        === Math.floor(neighbor.index / PACKAGE_SIZE) ? 1 : 0;
      neighborCount += 1;
    }
  }
  return matchingPackages / neighborCount;
}

function adjacency(engine: ReturnType<typeof createFixtureEngine>): Array<Set<number>> {
  const neighbors = Array.from({ length: NODE_COUNT }, () => new Set<number>());
  for (let edge = 0; edge < engine.edgeSources.length; edge += 1) {
    const source = engine.edgeSources[edge];
    const target = engine.edgeTargets[edge];
    neighbors[source].add(target);
    neighbors[target].add(source);
  }
  return neighbors;
}

function packageSeparationRatio(x: Float32Array, y: Float32Array): number {
  const packages = Array.from({ length: 4 }, (_, packageIndex) => (
    Array.from({ length: x.length }, (_, index) => index)
      .filter(index => Math.floor(index / PACKAGE_SIZE) === packageIndex)
  ));
  const centroids = packages.map(indexes => ({
    x: indexes.reduce((sum, index) => sum + x[index], 0) / indexes.length,
    y: indexes.reduce((sum, index) => sum + y[index], 0) / indexes.length,
  }));
  const meanRadius = packages.reduce((sum, indexes, packageIndex) => (
    sum + indexes.reduce((radius, index) => radius + Math.hypot(
      x[index] - centroids[packageIndex].x,
      y[index] - centroids[packageIndex].y,
    ), 0) / indexes.length
  ), 0) / packages.length;
  let minimumCentroidDistance = Number.POSITIVE_INFINITY;
  for (let first = 0; first < centroids.length; first += 1) {
    for (let second = first + 1; second < centroids.length; second += 1) {
      minimumCentroidDistance = Math.min(
        minimumCentroidDistance,
        Math.hypot(
          centroids[first].x - centroids[second].x,
          centroids[first].y - centroids[second].y,
        ),
      );
    }
  }
  return minimumCentroidDistance / meanRadius;
}

function maximumSpeed(engine: ReturnType<typeof createFixtureEngine>): number {
  let maximum = 0;
  for (let index = 0; index < engine.vx.length; index += 1) {
    maximum = Math.max(maximum, Math.hypot(engine.vx[index], engine.vy[index]));
  }
  return maximum;
}

function meanDisplacement(
  indexes: ReadonlySet<number>,
  engine: ReturnType<typeof createFixtureEngine>,
  initialX: Float32Array,
  initialY: Float32Array,
): number {
  let displacement = 0;
  for (const index of indexes) {
    displacement += Math.hypot(
      engine.x[index] - initialX[index],
      engine.y[index] - initialY[index],
    );
  }
  return displacement / indexes.size;
}

describe('500-node owned physics feel', () => {
  it('settles topology-local relationships into visible package clusters', { timeout: 30_000 }, () => {
    const engine = createFixtureEngine();

    for (let tick = 0; tick < SETTLEMENT_TICKS; tick += 1) engine.tick();

    expect(engine.settled).toBe(true);
    expect(nearestPackagePurity(engine.x, engine.y)).toBeGreaterThanOrEqual(0.7);
    expect(packageSeparationRatio(engine.x, engine.y)).toBeGreaterThanOrEqual(1.2);
  });

  it('responds to force-setting changes on the next tick without an explosive pulse', { timeout: 30_000 }, () => {
    const engine = createFixtureEngine();
    const changes: Array<{ config: Parameters<typeof engine.setConfig>[0]; tick: number }> = [
      { config: { chargeStrength: -50 }, tick: 120 },
      { config: { centralGravity: 0.2 }, tick: 240 },
      { config: { linkDistance: 120 }, tick: 360 },
      { config: { linkStrength: 0.8 }, tick: 480 },
    ];
    let currentTick = 0;

    for (const change of changes) {
      while (currentTick < change.tick) {
        engine.tick();
        currentTick += 1;
      }
      engine.setConfig(change.config);
      engine.tick();
      currentTick += 1;
      expect(maximumSpeed(engine)).toBeGreaterThan(0.1);
      expect(maximumSpeed(engine)).toBeLessThanOrEqual(30);
    }
  });

  it('keeps a high-degree hub stable while a connected leaf is dragged', { timeout: 30_000 }, () => {
    const engine = createFixtureEngine();
    for (let tick = 0; tick < SETTLEMENT_TICKS; tick += 1) engine.tick();
    const neighbors = adjacency(engine);
    let hub = 0;
    for (let index = 1; index < neighbors.length; index += 1) {
      if (neighbors[index].size > neighbors[hub].size) hub = index;
    }
    const leaf = [...neighbors[hub]].reduce((candidate, index) => (
      neighbors[index].size < neighbors[candidate].size ? index : candidate
    ));
    const initialHubX = engine.x[hub];
    const initialHubY = engine.y[hub];
    const dragDistance = 120;

    engine.pin(leaf);
    engine.setNodePosition(leaf, engine.x[leaf] + dragDistance, engine.y[leaf]);
    engine.setAlphaTarget(0.3);
    for (let tick = 0; tick < 12; tick += 1) engine.tick();

    const hubDisplacement = Math.hypot(
      engine.x[hub] - initialHubX,
      engine.y[hub] - initialHubY,
    );
    expect(hubDisplacement / dragDistance).toBeLessThanOrEqual(0.35);
  });

  it('ripples a hub drag through nearby relationships and settles after release', { timeout: 30_000 }, () => {
    const engine = createFixtureEngine();
    for (let tick = 0; tick < SETTLEMENT_TICKS; tick += 1) engine.tick();
    const neighbors = adjacency(engine);
    let hub = 0;
    for (let index = 1; index < neighbors.length; index += 1) {
      if (neighbors[index].size > neighbors[hub].size) hub = index;
    }
    const oneHop = neighbors[hub];
    const twoHop = new Set<number>();
    for (const neighbor of oneHop) {
      for (const candidate of neighbors[neighbor]) {
        if (candidate !== hub && !oneHop.has(candidate)) twoHop.add(candidate);
      }
    }
    const initialX = new Float32Array(engine.x);
    const initialY = new Float32Array(engine.y);

    engine.pin(hub);
    engine.setNodePosition(hub, engine.x[hub] + 120, engine.y[hub]);
    engine.setAlphaTarget(0.3);
    engine.tick();
    engine.tick();

    const oneHopDisplacement = meanDisplacement(oneHop, engine, initialX, initialY);
    const twoHopDisplacement = meanDisplacement(twoHop, engine, initialX, initialY);
    expect(oneHopDisplacement).toBeGreaterThan(0.1);
    expect(twoHopDisplacement / oneHopDisplacement).toBeLessThanOrEqual(0.75);

    engine.release(hub);
    engine.setAlphaTarget(0);
    let releaseTicks = 0;
    while (!engine.settled && releaseTicks < 180) {
      engine.tick();
      releaseTicks += 1;
    }
    expect(engine.settled).toBe(true);
    expect(releaseTicks).toBeGreaterThanOrEqual(30);
  });
});
