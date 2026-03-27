import { buildSimilarityEdges } from './similarityEdges';

function collectComponent(start: number, edges: Map<number, number[]>, visited: Set<number>): number[] {
  const stack = [start];
  const component: number[] = [];

  while (stack.length > 0) {
    const index = stack.pop()!;
    if (visited.has(index)) {
      continue;
    }

    visited.add(index);
    component.push(index);
    edges.get(index)!.forEach((neighbor) => {
      stack.push(neighbor);
    });
  }

  return component;
}

export function connectedComponents(
  featureLists: Array<string[] | undefined>,
  threshold: number
): number[][] {
  const edges = buildSimilarityEdges(featureLists, threshold);
  const visited = new Set<number>();
  const components: number[][] = [];

  Array.from(edges.keys()).forEach((start) => {
    if (!visited.has(start)) {
      components.push(collectComponent(start, edges, visited));
    }
  });

  return components;
}
