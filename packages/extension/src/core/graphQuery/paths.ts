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

function graphHasEndpoints(graphData: IGraphData, config: GraphQueryPathConfig): boolean {
  const nodeIds = new Set(graphData.nodes.map((node) => node.id));
  return nodeIds.has(config.from) && nodeIds.has(config.to);
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

function collectDirectedPaths(
  graphData: IGraphData,
  config: GraphQueryPathConfig,
  maxDepth: number,
  maxPaths: number,
): string[][] {
  const adjacency = createAdjacency(graphData);
  const queue: string[][] = [[config.from]];
  const paths: string[][] = [];

  while (queue.length > 0 && paths.length < maxPaths) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    if (current === config.to) {
      paths.push(path);
    } else if (path.length - 1 < maxDepth) {
      queue.push(...nextAcyclicPaths(path, adjacency));
    }
  }

  return paths;
}

export function findGraphPaths(
  graphData: IGraphData,
  config: GraphQueryPathConfig,
): GraphQueryPathReport {
  const maxDepth = normalizePositiveInteger(config.maxDepth, DEFAULT_MAX_DEPTH);
  const maxPaths = normalizePositiveInteger(config.maxPaths, DEFAULT_MAX_PATHS);
  const paths = graphHasEndpoints(graphData, config)
    ? collectDirectedPaths(graphData, config, maxDepth, maxPaths)
    : [];

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
