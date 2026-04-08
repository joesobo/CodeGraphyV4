import { buildSimilarityEdges } from './edges';

function collectComponent(start: number, edges: Map<number, number[]>, visited: Set<number>): number[] {
  const stack = [start];
  const component: number[] = [];
  const queued = new Set<number>([start]);
  visited.add(start);

  for (let index = 0; index < stack.length; index++) {
    const current = stack[index];
    component.push(current);
    for (const neighbor of edges.get(current) ?? []) {
      if (queued.has(neighbor)) {
        continue;
      }

      queued.add(neighbor);
      visited.add(neighbor);
      stack.push(neighbor);
    }
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

  for (const start of edges.keys()) {
    if (!visited.has(start)) {
      components.push(collectComponent(start, edges, visited));
    }
  }

  return components;
}
