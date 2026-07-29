const ITERATIONS = 20;
const DAMPING = 0.85;

type WeightedLinks = ReadonlyMap<string, ReadonlyMap<string, number>>;

function normalizePersonalization(
  paths: readonly string[],
  personalization: ReadonlyMap<string, number>,
): Map<string, number> {
  const total = [...personalization.values()].reduce((sum, value) => sum + value, 0);
  const fallback = 1 / Math.max(paths.length, 1);
  return new Map(paths.map(path => [
    path,
    total > 0 ? (personalization.get(path) ?? 0) / total : fallback,
  ]));
}

function danglingRankMass(
  paths: readonly string[],
  links: WeightedLinks,
  ranks: ReadonlyMap<string, number>,
): number {
  return paths
    .filter(path => (links.get(path)?.size ?? 0) === 0)
    .reduce((total, path) => total + (ranks.get(path) ?? 0), 0);
}

function distributeTaskMapRank(
  path: string,
  neighbors: ReadonlyMap<string, number>,
  ranks: ReadonlyMap<string, number>,
  next: Map<string, number>,
): void {
  const totalWeight = [...neighbors.values()].reduce((total, weight) => total + weight, 0);
  if (totalWeight === 0) return;
  for (const [neighbor, weight] of neighbors) {
    const contribution = DAMPING * (ranks.get(path) ?? 0) * weight / totalWeight;
    next.set(neighbor, (next.get(neighbor) ?? 0) + contribution);
  }
}

function nextTaskMapRanks(
  paths: readonly string[],
  links: WeightedLinks,
  personalization: ReadonlyMap<string, number>,
  ranks: ReadonlyMap<string, number>,
): Map<string, number> {
  const danglingMass = danglingRankMass(paths, links, ranks);
  const next = new Map<string, number>(paths.map(path => [
    path,
    ((1 - DAMPING) + DAMPING * danglingMass) * (personalization.get(path) ?? 0),
  ]));
  for (const path of paths) {
    distributeTaskMapRank(path, links.get(path) ?? new Map(), ranks, next);
  }
  return next;
}

export function rankTaskMapGraph(
  links: WeightedLinks,
  personalization: ReadonlyMap<string, number>,
): Map<string, number> {
  const paths = [...links.keys()];
  const normalized = normalizePersonalization(paths, personalization);
  let ranks = new Map(normalized);

  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    ranks = nextTaskMapRanks(paths, links, normalized, ranks);
  }
  return ranks;
}
