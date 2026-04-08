import type { IGraphData } from '@codegraphy-vscode/plugin-api';

export function buildUndirectedAdjacencyList(data: IGraphData): Map<string, Set<string>> {
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

export function walkDepthFromNode(
  rootNodeId: string,
  depthLimit: number,
  adjacencyList: Map<string, Set<string>>,
): Map<string, number> {
  const depths = new Map<string, number>();

  if (!adjacencyList.has(rootNodeId)) {
    return depths;
  }

  const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: rootNodeId, depth: 0 }];
  depths.set(rootNodeId, 0);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (!current || current.depth >= depthLimit) {
      continue;
    }

    for (const neighbor of adjacencyList.get(current.nodeId) ?? []) {
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
