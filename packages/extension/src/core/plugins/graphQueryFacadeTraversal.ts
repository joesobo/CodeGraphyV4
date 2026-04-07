import type { IGraphData, IGraphNode } from '../../shared/graph/types';
import { getGraphIndex } from './graphQueryFacadeIndex';
import type { GraphDataGetter } from './graphQueryFacade';

export function getSubgraph(
  nodeId: string,
  hops: number,
  getGraphData: GraphDataGetter,
): IGraphData {
  const graphData = getGraphData();
  const { graph } = getGraphIndex(graphData);
  if (!graph.hasNode(nodeId) || hops < 0) {
    return { nodes: [], edges: [] };
  }

  const queue: Array<{ depth: number; id: string }> = [{ depth: 0, id: nodeId }];
  const visited = new Set<string>([nodeId]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= hops) {
      continue;
    }

    for (const neighborId of graph.neighbors(current.id)) {
      if (visited.has(neighborId)) {
        continue;
      }

      visited.add(neighborId);
      queue.push({ depth: current.depth + 1, id: neighborId });
    }
  }

  return {
    nodes: graphData.nodes.filter((node) => visited.has(node.id)),
    edges: graphData.edges.filter(
      (edge) => visited.has(edge.from) && visited.has(edge.to),
    ),
  };
}

export function findPath(
  fromId: string,
  toId: string,
  getGraphData: GraphDataGetter,
): IGraphNode[] | null {
  const { graph, nodeById } = getGraphIndex(getGraphData());
  if (!graph.hasNode(fromId) || !graph.hasNode(toId)) {
    return null;
  }

  const queue = [fromId];
  const previous = new Map<string, string | null>([[fromId, null]]);

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    if (currentId === toId) {
      break;
    }

    for (const neighborId of graph.outNeighbors(currentId)) {
      if (previous.has(neighborId)) {
        continue;
      }

      previous.set(neighborId, currentId);
      queue.push(neighborId);
    }
  }

  if (!previous.has(toId)) {
    return null;
  }

  const nodeIds: string[] = [];
  let cursor: string | null = toId;
  while (cursor) {
    nodeIds.push(cursor);
    cursor = previous.get(cursor) ?? null;
  }

  return nodeIds
    .reverse()
    .map((id) => nodeById.get(id))
    .filter((node): node is IGraphNode => Boolean(node));
}
