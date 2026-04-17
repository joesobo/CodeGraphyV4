import type { IGraphData } from '../../../shared/graph/contracts';

const EMPTY_NEIGHBORS = new Set<string>();

export function buildUndirectedAdjacencyList(data: IGraphData): Map<string, Set<string>> {
  const adjacencyList = new Map<string, Set<string>>();

  for (const node of data.nodes) {
    adjacencyList.set(node.id, new Set());
  }

  for (const edge of data.edges) {
    const fromNeighbors = adjacencyList.get(edge.from);
    const toNeighbors = adjacencyList.get(edge.to);
    if (!fromNeighbors || !toNeighbors) {
      continue;
    }

    fromNeighbors.add(edge.to);
    toNeighbors.add(edge.from);
  }

  return adjacencyList;
}

export function walkDepthFromNode(
  rootNodeId: string | undefined,
  depthLimit: number,
  adjacencyList: Map<string, Set<string>>,
): Map<string, number> {
  const depths = new Map<string, number>();

  if (!rootNodeId || !adjacencyList.has(rootNodeId)) {
    return depths;
  }

  const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: rootNodeId, depth: 0 }];
  depths.set(rootNodeId, 0);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current.depth >= depthLimit) {
      continue;
    }

    const neighbors = adjacencyList.get(current.nodeId) ?? EMPTY_NEIGHBORS;
    for (const neighbor of neighbors) {
      if (depths.has(neighbor)) {
        continue;
      }

      const nextDepth = current.depth + 1;
      depths.set(neighbor, nextDepth);
      queue.push({ nodeId: neighbor, depth: nextDepth });
    }
  }

  return depths;
}
