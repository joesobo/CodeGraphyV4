import type { IGraphData } from '../../shared/graph/contracts';
import type { GraphQueryPathConfig, GraphQueryPathReport } from './model';

const DEFAULT_MAX_DEPTH = 10;
const DEFAULT_MAX_PATHS = 3;

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.floor(value));
}

function createAdjacency(graphData: IGraphData): Map<string, string[]> {
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

export function findGraphPaths(
  graphData: IGraphData,
  config: GraphQueryPathConfig,
): GraphQueryPathReport {
  const maxDepth = normalizePositiveInteger(config.maxDepth, DEFAULT_MAX_DEPTH);
  const maxPaths = normalizePositiveInteger(config.maxPaths, DEFAULT_MAX_PATHS);
  const nodeIds = new Set(graphData.nodes.map((node) => node.id));
  const paths: string[][] = [];

  if (nodeIds.has(config.from) && nodeIds.has(config.to)) {
    const adjacency = createAdjacency(graphData);
    const queue: string[][] = [[config.from]];

    while (queue.length > 0 && paths.length < maxPaths) {
      const path = queue.shift();
      if (!path) {
        continue;
      }

      const current = path[path.length - 1];
      if (current === config.to) {
        paths.push(path);
        continue;
      }

      if (path.length - 1 >= maxDepth) {
        continue;
      }

      for (const next of adjacency.get(current) ?? []) {
        if (!path.includes(next)) {
          queue.push([...path, next]);
        }
      }
    }
  }

  return {
    from: config.from,
    to: config.to,
    paths,
    limits: {
      maxDepth,
      maxPaths,
    },
  };
}
