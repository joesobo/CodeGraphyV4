import type { GraphEdgeKind, IGraphEdge } from '../../../../shared/graph/contracts';
import { getEdgesByKeys, getGraphIndex } from '../index/cache';
import type { GraphDataGetter } from '../facade';

export function getIncomingEdges(nodeId: string, getGraphData: GraphDataGetter): IGraphEdge[] {
  const { edgeById, graph } = getGraphIndex(getGraphData());
  if (!graph.hasNode(nodeId)) {
    return [];
  }

  return getEdgesByKeys(graph.inEdges(nodeId), edgeById);
}

export function getOutgoingEdges(nodeId: string, getGraphData: GraphDataGetter): IGraphEdge[] {
  const { edgeById, graph } = getGraphIndex(getGraphData());
  if (!graph.hasNode(nodeId)) {
    return [];
  }

  return getEdgesByKeys(graph.outEdges(nodeId), edgeById);
}

export function getEdgesFor(nodeId: string, getGraphData: GraphDataGetter): IGraphEdge[] {
  const { edgeById, graph } = getGraphIndex(getGraphData());
  if (!graph.hasNode(nodeId)) {
    return [];
  }

  return getEdgesByKeys(graph.edges(nodeId), edgeById);
}

export function filterEdgesByKind(
  kind: GraphEdgeKind | GraphEdgeKind[],
  getGraphData: GraphDataGetter,
): IGraphEdge[] {
  const graphData = getGraphData();
  const kinds = new Set(Array.isArray(kind) ? kind : [kind]);
  return graphData.edges.filter((edge) => kinds.has(edge.kind));
}
