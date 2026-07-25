const ITERATIONS = 20;
const DAMPING = 0.85;

export function rankTaskMapGraph(
  links: ReadonlyMap<string, ReadonlyMap<string, number>>,
  personalization: ReadonlyMap<string, number>,
): Map<string, number> {
  const paths = [...links.keys()];
  const totalPersonalization = [...personalization.values()].reduce((total, value) => total + value, 0);
  const normalized = new Map<string, number>(paths.map(path => [
    path,
    totalPersonalization > 0 ? (personalization.get(path) ?? 0) / totalPersonalization : 1 / Math.max(paths.length, 1),
  ]));
  let ranks = new Map(normalized);

  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const danglingMass = paths
      .filter(path => (links.get(path)?.size ?? 0) === 0)
      .reduce((total, path) => total + (ranks.get(path) ?? 0), 0);
    const next = new Map<string, number>(paths.map(path => [
      path,
      ((1 - DAMPING) + DAMPING * danglingMass) * (normalized.get(path) ?? 0),
    ]));
    for (const path of paths) {
      const neighbors = links.get(path) ?? new Map<string, number>();
      const totalWeight = [...neighbors.values()].reduce((total, weight) => total + weight, 0);
      if (totalWeight === 0) continue;
      for (const [neighbor, weight] of neighbors) {
        next.set(neighbor, (next.get(neighbor) ?? 0) + DAMPING * (ranks.get(path) ?? 0) * weight / totalWeight);
      }
    }
    ranks = next;
  }

  return ranks;
}
