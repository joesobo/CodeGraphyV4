import type { IGraphData } from '../../../shared/graph/contracts';
import type { IViewContext } from '../contracts';
import { buildUndirectedAdjacencyList, walkDepthFromNode } from './graph';
import { clampDepthLimit, MAX_DEPTH_LIMIT } from './limits';

export function getDepthGraphMaxDepthLimit(
  data: IGraphData,
  focusedFile: string | undefined,
  fallbackMaxDepthLimit: number = MAX_DEPTH_LIMIT,
): number {
  const adjacencyList = buildUndirectedAdjacencyList(data);
  const depths = walkDepthFromNode(focusedFile, MAX_DEPTH_LIMIT, adjacencyList);
  if (depths.size === 0) {
    return fallbackMaxDepthLimit;
  }

  const maxReachableDepth = Math.max(...depths.values());
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

export function filterDepthGraph(data: IGraphData, context: IViewContext): IGraphData {
  const adjacencyList = buildUndirectedAdjacencyList(data);
  const depths = walkDepthFromNode(
    context.focusedFile,
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
