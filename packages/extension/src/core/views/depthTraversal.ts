/**
 * @fileoverview BFS traversal for depth-limited graph exploration.
 * @module core/views/depthTraversal
 */

import type { IGraphData } from '../../shared/graph/types';

/**
 * Build an undirected adjacency list from graph data.
 */
export function buildAdjacencyList(data: IGraphData): Map<string, Set<string>> {
  const adjacencyList = new Map<string, Set<string>>();
  for (const node of data.nodes) {
    adjacencyList.set(node.id, new Set());
  }
  for (const edge of data.edges) {
    adjacencyList.get(edge.from)?.add(edge.to);
    adjacencyList.get(edge.to)?.add(edge.from);
  }
  return adjacencyList;
}

/**
 * BFS from a start node, returning a map of nodeId → depth.
 */
export function bfsFromNode(
  startNode: string,
  depthLimit: number,
  adjacencyList: Map<string, Set<string>>,
): Map<string, number> {
  const nodeDepths = new Map<string, number>();
  const queue: Array<{ nodeId: string; depth: number }> = adjacencyList.has(startNode)
    ? [{ nodeId: startNode, depth: 0 }]
    : [];

  if (queue.length === 0) {
    return nodeDepths;
  }

  nodeDepths.set(startNode, 0);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const entry = queue[cursor];
    if (!entry) continue;

    const { nodeId, depth } = entry;
    if (depth >= depthLimit) continue;

    const neighbors = adjacencyList.get(nodeId);
    if (!neighbors) continue;

    for (const neighbor of neighbors) {
      if (!nodeDepths.has(neighbor)) {
        nodeDepths.set(neighbor, depth + 1);
        queue.push({ nodeId: neighbor, depth: depth + 1 });
      }
    }
  }

  return nodeDepths;
}
