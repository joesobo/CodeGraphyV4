function similaritySet(features: string[] | undefined): Set<string> {
  return new Set(features ?? []);
}

export function jaccardSimilarity(left: string[] | undefined, right: string[] | undefined): number {
  const leftSet = similaritySet(left);
  const rightSet = similaritySet(right);
  if (leftSet.size === 0 || rightSet.size === 0) {
    return 0;
  }

  let intersection = 0;
  leftSet.forEach((feature) => {
    if (rightSet.has(feature)) {
      intersection += 1;
    }
  });

  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
}

function adjacencyMap(featureLists: Array<string[] | undefined>, threshold: number): Map<number, number[]> {
  const edges = new Map<number, number[]>();

  featureLists.forEach((features, index) => {
    if ((features?.length ?? 0) > 0) {
      edges.set(index, []);
    }
  });

  for (let left = 0; left < featureLists.length; left += 1) {
    for (let right = left + 1; right < featureLists.length; right += 1) {
      if (jaccardSimilarity(featureLists[left], featureLists[right]) >= threshold) {
        edges.get(left)?.push(right);
        edges.get(right)?.push(left);
      }
    }
  }

  return edges;
}

function collectComponent(
  start: number,
  edges: Map<number, number[]>,
  visited: Set<number>
): number[] {
  const stack = [start];
  const component: number[] = [];

  while (stack.length > 0) {
    const index = stack.pop()!;
    if (visited.has(index)) {
      continue;
    }

    visited.add(index);
    component.push(index);
    edges.get(index)?.forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    });
  }

  return component;
}

function connectedComponents(featureLists: Array<string[] | undefined>, threshold: number): number[][] {
  const edges = adjacencyMap(featureLists, threshold);
  const visited = new Set<number>();
  const components: number[][] = [];

  for (const start of edges.keys()) {
    if (!visited.has(start)) {
      components.push(collectComponent(start, edges, visited));
    }
  }

  return components;
}

export function featureGroupSizes(featureLists: Array<string[] | undefined>, threshold = 0.5): number[] {
  const sizes = Array.from({ length: featureLists.length }, () => 0);
  connectedComponents(featureLists, threshold).forEach((component) => {
    component.forEach((index) => {
      sizes[index] = component.length;
    });
  });
  return sizes;
}

export function shapeDiversity(featureLists: Array<string[] | undefined>, threshold = 0.5): number {
  return connectedComponents(featureLists, threshold).length;
}

export function averagePairwiseSimilarity(featureLists: Array<string[] | undefined>): number {
  let total = 0;
  let pairs = 0;

  for (let left = 0; left < featureLists.length; left += 1) {
    for (let right = left + 1; right < featureLists.length; right += 1) {
      total += jaccardSimilarity(featureLists[left], featureLists[right]);
      pairs += 1;
    }
  }

  return pairs === 0 ? 0 : total / pairs;
}
