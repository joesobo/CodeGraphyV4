import type { IGraphNode, IGraphData } from '../../shared/graph/types';
import { getGraphIndex } from './graphQueryFacadeIndex';
import type { GraphDataGetter } from './graphQueryFacade';

export function getGraph(getGraphData: GraphDataGetter): IGraphData {
  return getGraphData();
}

export function getNode(id: string, getGraphData: GraphDataGetter): IGraphNode | null {
  const { nodeById } = getGraphIndex(getGraphData());
  return nodeById.get(id) ?? null;
}

export function getNeighbors(id: string, getGraphData: GraphDataGetter): IGraphNode[] {
  const { graph, nodeById } = getGraphIndex(getGraphData());
  if (!graph.hasNode(id)) {
    return [];
  }

  return graph.neighbors(id)
    .map((neighborId) => nodeById.get(neighborId))
    .filter((node): node is IGraphNode => Boolean(node));
}
