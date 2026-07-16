import { createGraphLayoutEngine } from '@graph-renderer';

export const NODE_COUNT = 500;
export const SETTLEMENT_TICKS = 310;
export const FEEL_TEST_TIMEOUT_MS = 60_000;
const PACKAGE_SIZE = 128;
const ORPHAN_INTERVAL = 50;

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function createFixtureEdges(): { sources: Uint32Array; targets: Uint32Array } {
  const random = createRandom(307);
  const globalTickets: number[] = [];
  const localTickets = new Map<number, number[]>();
  const sources: number[] = [];
  const targets: number[] = [];
  const addTickets = (nodeIndex: number, count: number): void => {
    const packageIndex = Math.floor(nodeIndex / PACKAGE_SIZE);
    const packageTickets = localTickets.get(packageIndex) ?? [];
    localTickets.set(packageIndex, packageTickets);
    for (let ticket = 0; ticket < count; ticket += 1) {
      globalTickets.push(nodeIndex);
      packageTickets.push(nodeIndex);
    }
  };

  for (let source = 0; source < NODE_COUNT; source += 1) {
    if (source % ORPHAN_INTERVAL === ORPHAN_INTERVAL - 1) continue;
    if (globalTickets.length === 0) {
      addTickets(source, 1);
      continue;
    }
    const packageTickets = localTickets.get(Math.floor(source / PACKAGE_SIZE)) ?? [];
    const outgoing = Math.min(12, 1 + Math.floor(Math.log(1 - random()) / Math.log(0.68)));
    const selected = new Set<number>();
    for (let attempt = 0; selected.size < outgoing && attempt < outgoing * 12; attempt += 1) {
      const tickets = packageTickets.length > 0 && random() < 0.78
        ? packageTickets
        : globalTickets;
      selected.add(tickets[Math.floor(random() * tickets.length)]);
    }
    for (const target of selected) {
      sources.push(source);
      targets.push(target);
      addTickets(target, 1);
      if (random() < 0.025) {
        sources.push(target);
        targets.push(source);
        addTickets(source, 1);
      }
    }
    addTickets(source, 1 + selected.size);
  }
  return { sources: Uint32Array.from(sources), targets: Uint32Array.from(targets) };
}

export function createFixtureEngine() {
  const edges = createFixtureEdges();
  return createGraphLayoutEngine({
    nodeIds: Array.from({ length: NODE_COUNT }, (_, index) => `node-${index}`),
    radii: new Float32Array(NODE_COUNT).fill(4),
    edgeSources: edges.sources,
    edgeTargets: edges.targets,
  });
}

export type FixtureEngine = ReturnType<typeof createFixtureEngine>;

export function nearestPackagePurity(x: Float32Array, y: Float32Array): number {
  let matchingPackages = 0;
  let neighborCount = 0;
  for (let index = 0; index < x.length; index += 1) {
    const neighbors: Array<{ distance: number; index: number }> = [];
    for (let other = 0; other < x.length; other += 1) {
      if (other !== index) neighbors.push({
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
      minimumCentroidDistance = Math.min(minimumCentroidDistance, Math.hypot(
        centroids[first].x - centroids[second].x,
        centroids[first].y - centroids[second].y,
      ));
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
