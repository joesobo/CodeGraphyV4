import { createGraphLayoutEngine } from '../../../extension/src/webview/components/graph/rendering/surface/owned2d/physics/engine';
import { generateSyntheticGraph } from '../../src/fixture/generate';

export const NODE_COUNT = 500;
export const SETTLEMENT_TICKS = 310;
export const FEEL_TEST_TIMEOUT_MS = 60_000;
const PACKAGE_SIZE = 128;

export function createFixtureEngine() {
  const graph = generateSyntheticGraph({ nodeCount: NODE_COUNT, seed: 307 });
  const indexes = new Map(graph.nodes.map((node, index) => [node.id, index]));
  return createGraphLayoutEngine({
    nodeIds: graph.nodes.map(node => node.id),
    radii: new Float32Array(NODE_COUNT).fill(4),
    edgeSources: Uint32Array.from(graph.edges.map(edge => indexes.get(edge.from) as number)),
    edgeTargets: Uint32Array.from(graph.edges.map(edge => indexes.get(edge.to) as number)),
  });
}

export type FixtureEngine = ReturnType<typeof createFixtureEngine>;

export function nearestPackagePurity(x: Float32Array, y: Float32Array): number {
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

export function adjacency(engine: FixtureEngine): Array<Set<number>> {
  const neighbors = Array.from({ length: NODE_COUNT }, () => new Set<number>());
  for (let edge = 0; edge < engine.edgeSources.length; edge += 1) {
    const source = engine.edgeSources[edge];
    const target = engine.edgeTargets[edge];
    neighbors[source].add(target);
    neighbors[target].add(source);
  }
  return neighbors;
}

export function packageSeparationRatio(x: Float32Array, y: Float32Array): number {
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

export function maximumSpeed(engine: FixtureEngine): number {
  let maximum = 0;
  for (let index = 0; index < engine.vx.length; index += 1) {
    maximum = Math.max(maximum, Math.hypot(engine.vx[index], engine.vy[index]));
  }
  return maximum;
}

export function meanDisplacement(
  indexes: ReadonlySet<number>,
  engine: FixtureEngine,
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
