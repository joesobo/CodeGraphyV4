import type { IGraphData } from '../../../shared/graph/types';
import type { IView, IViewContext } from '../contracts';

export const MIN_DEPTH_LIMIT = 1;
export const MAX_DEPTH_LIMIT = 10;

function clampDepthLimit(
  depthLimit: number | undefined,
  maxDepthLimit: number = MAX_DEPTH_LIMIT,
): number {
  if (depthLimit === undefined) {
    return MIN_DEPTH_LIMIT;
  }

  return Math.max(MIN_DEPTH_LIMIT, Math.min(maxDepthLimit, depthLimit));
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

export function getDepthGraphMaxDepthLimit(
  data: IGraphData,
  focusedFile: string | undefined,
  fallbackMaxDepthLimit: number = MAX_DEPTH_LIMIT,
): number {
  if (!focusedFile) {
    return fallbackMaxDepthLimit;
  }

  const adjacencyList = buildUndirectedAdjacencyList(data);
  const depths = walkDepthFromNode(focusedFile, MAX_DEPTH_LIMIT, adjacencyList);
  if (depths.size === 0) {
    return fallbackMaxDepthLimit;
  }

  let maxReachableDepth = 0;
  for (const depth of depths.values()) {
    if (depth > maxReachableDepth) {
      maxReachableDepth = depth;
    }
  }

  return clampDepthLimit(maxReachableDepth, MAX_DEPTH_LIMIT);
}

export function getDepthGraphEffectiveDepthLimit(
  data: IGraphData,
  context: IViewContext,
  fallbackMaxDepthLimit: number = MAX_DEPTH_LIMIT,
): number {
  const maxDepthLimit = getDepthGraphMaxDepthLimit(
    data,
    context.focusedFile,
    fallbackMaxDepthLimit,
  );
  return clampDepthLimit(context.depthLimit, maxDepthLimit);
}

function filterDepthGraph(data: IGraphData, context: IViewContext): IGraphData {
  const focusedFile = context.focusedFile;
  if (!focusedFile) {
    return data;
  }

  const adjacencyList = buildUndirectedAdjacencyList(data);
  const depths = walkDepthFromNode(
    focusedFile,
    getDepthGraphEffectiveDepthLimit(data, context),
    adjacencyList,
  );

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
  recomputeOn: ['focusedFile', 'depthLimit'],
  transform(data: IGraphData, context: IViewContext) {
    return filterDepthGraph(data, context);
  },
};
