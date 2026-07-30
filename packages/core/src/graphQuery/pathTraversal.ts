import type { IGraphData, IGraphEdge } from '../graph/contracts';
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

export interface IncomingDirectedPath {
  nodes: string[];
  edges: IGraphEdge[];
}

export interface IncomingDirectedPathResult {
  paths: ReadonlyMap<string, IncomingDirectedPath>;
  depthTruncated: boolean;
  visitedTruncated: boolean;
}

function createIncomingAdjacency(graphData: IGraphData): Map<string, IGraphEdge[]> {
  const incoming = new Map<string, IGraphEdge[]>();
  for (const edge of graphData.edges) {
    const edges = incoming.get(edge.to) ?? [];
    edges.push(edge);
    incoming.set(edge.to, edges);
  }
  for (const edges of incoming.values()) {
    edges.sort((left, right) => (
      left.from.localeCompare(right.from)
      || left.kind.localeCompare(right.kind)
      || left.to.localeCompare(right.to)
    ));
  }
  return incoming;
}

export function collectIncomingDirectedPathResult(
  graphData: IGraphData,
  startIds: readonly string[],
  maxDepth: number,
  maxVisitedNodes: number,
): IncomingDirectedPathResult {
  const incoming = createIncomingAdjacency(graphData);
  const paths = new Map<string, IncomingDirectedPath>();
  const queue: string[] = [];
  for (const startId of [...new Set(startIds)].sort()) {
    paths.set(startId, { nodes: [startId], edges: [] });
    queue.push(startId);
  }
  let depthTruncated = false;
  let visitedTruncated = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentPath = paths.get(current)!;
    const candidates = incoming.get(current) ?? [];
    if (currentPath.edges.length >= maxDepth) {
      depthTruncated ||= candidates.some(edge => !paths.has(edge.from));
      continue;
    }
    for (const edge of candidates) {
      if (paths.has(edge.from)) continue;
      if (paths.size >= maxVisitedNodes) {
        visitedTruncated = true;
        continue;
      }
      paths.set(edge.from, {
        nodes: [edge.from, ...currentPath.nodes],
        edges: [edge, ...currentPath.edges],
      });
      queue.push(edge.from);
    }
  }

  return { paths, depthTruncated, visitedTruncated };
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
