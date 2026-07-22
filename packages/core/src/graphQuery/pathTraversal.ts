import type { IGraphData } from '../graph/contracts';
import type { GraphQueryPathConfig } from './model';

export function createPathAdjacency(graphData: IGraphData): Map<string, string[]> {
  const adjacency = new Map<string, Set<string>>();

  for (const edge of graphData.edges) {
    if (!adjacency.has(edge.from)) {
      adjacency.set(edge.from, new Set());
    }
    adjacency.get(edge.from)?.add(edge.to);
  }

  return new Map(
    [...adjacency.entries()].map(([from, targets]) => [
      from,
      [...targets].sort((left, right) => left.localeCompare(right)),
    ]),
  );
}

function nextAcyclicPaths(
  path: readonly string[],
  adjacency: ReadonlyMap<string, readonly string[]>,
): string[][] {
  const current = path[path.length - 1];
  return (adjacency.get(current) ?? [])
    .filter((next) => !path.includes(next))
    .map((next) => [...path, next]);
}

export function collectDirectedPaths(
  graphData: IGraphData,
  config: GraphQueryPathConfig,
  maxDepth: number,
  maxPaths: number,
): string[][] {
  return collectDirectedPathResult(graphData, config, maxDepth, maxPaths).paths;
}

export interface DirectedPathResult {
  paths: string[][];
  truncated: boolean;
}

export function collectDirectedPathResult(
  graphData: IGraphData,
  config: GraphQueryPathConfig,
  maxDepth: number,
  maxPaths: number,
): DirectedPathResult {
  const adjacency = createPathAdjacency(graphData);
  const queue: string[][] = [[config.from]];
  const paths: string[][] = [];
  let depthTruncated = false;

  while (queue.length > 0 && paths.length < maxPaths) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    if (current === config.to) {
      paths.push(path);
    } else if (path.length - 1 < maxDepth) {
      queue.push(...nextAcyclicPaths(path, adjacency));
    } else if (nextAcyclicPaths(path, adjacency).length > 0) {
      depthTruncated = true;
    }
  }

  return { paths, truncated: depthTruncated || queue.length > 0 };
}
