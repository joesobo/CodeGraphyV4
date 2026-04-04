import type { IGraphData } from '../../../shared/graph/types';
import type { IView, IViewContext } from '../contracts';

const MIN_DEPTH_LIMIT = 1;
const MAX_DEPTH_LIMIT = 5;

function clampDepthLimit(depthLimit: number | undefined): number {
  if (depthLimit === undefined) {
    return MIN_DEPTH_LIMIT;
  }

  return Math.max(MIN_DEPTH_LIMIT, Math.min(MAX_DEPTH_LIMIT, depthLimit));
}

function buildUndirectedAdjacencyList(data: IGraphData): Map<string, Set<string>> {
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

function walkDepthFromNode(
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
    if (!current) continue;

    if (current.depth >= depthLimit) {
      continue;
    }

    for (const neighbor of adjacencyList.get(current.nodeId) ?? []) {
      if (depths.has(neighbor)) continue;
      const nextDepth = current.depth + 1;
      depths.set(neighbor, nextDepth);
      queue.push({ nodeId: neighbor, depth: nextDepth });
    }
  }

  return depths;
}

function filterDepthGraph(data: IGraphData, context: IViewContext): IGraphData {
  const focusedFile = context.focusedFile;
  if (!focusedFile) {
    return data;
  }

  const adjacencyList = buildUndirectedAdjacencyList(data);
  const depths = walkDepthFromNode(focusedFile, clampDepthLimit(context.depthLimit), adjacencyList);

  if (depths.size === 0) {
    return data;
  }

  const includedNodeIds = new Set(depths.keys());
  const nodes = data.nodes
    .filter(node => includedNodeIds.has(node.id))
    .map(node => ({
      ...node,
      depthLevel: depths.get(node.id),
    }));
  const edges = data.edges.filter(
    edge => includedNodeIds.has(edge.from) && includedNodeIds.has(edge.to),
  );

  return { nodes, edges };
}

export const depthGraphView: IView = {
  id: 'codegraphy.depth-graph',
  name: 'Depth Graph',
  icon: 'target',
  description: 'Shows a local graph around the focused file',
  transform(data: IGraphData, context: IViewContext) {
    return filterDepthGraph(data, context);
  },
};
