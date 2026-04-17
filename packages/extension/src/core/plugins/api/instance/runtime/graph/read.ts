import type { IGraphData, IGraphEdge, IGraphNode } from '../../../../../../shared/graph/contracts';
import type { ApiContext } from '../state/context';
import {
  filterEdgesByKind as facadeFilterEdgesByKind,
  findPath as facadeFindPath,
  getEdgesFor as facadeGetEdgesFor,
  getGraph as facadeGetGraph,
  getIncomingEdges as facadeGetIncomingEdges,
  getNeighbors as facadeGetNeighbors,
  getNode as facadeGetNode,
  getOutgoingEdges as facadeGetOutgoingEdges,
  getSubgraph as facadeGetSubgraph,
} from '../../../../graphQuery/facade';

type GraphContext = Pick<ApiContext, 'graphProvider'>;

export function getGraphData(context: GraphContext): IGraphData {
  return facadeGetGraph(context.graphProvider);
}

export function getNodeData(id: string, context: GraphContext): IGraphNode | null {
  return facadeGetNode(id, context.graphProvider);
}

export function getNodeNeighbors(id: string, context: GraphContext): IGraphNode[] {
  return facadeGetNeighbors(id, context.graphProvider);
}

export function getNodeIncomingEdges(nodeId: string, context: GraphContext): IGraphEdge[] {
  return facadeGetIncomingEdges(nodeId, context.graphProvider);
}

export function getNodeOutgoingEdges(nodeId: string, context: GraphContext): IGraphEdge[] {
  return facadeGetOutgoingEdges(nodeId, context.graphProvider);
}

export function getNodeEdgesFor(nodeId: string, context: GraphContext): IGraphEdge[] {
  return facadeGetEdgesFor(nodeId, context.graphProvider);
}

export function filterNodeEdgesByKind(
  kind: IGraphEdge['kind'] | IGraphEdge['kind'][],
  context: GraphContext,
): IGraphEdge[] {
  return facadeFilterEdgesByKind(kind, context.graphProvider);
}

export function getNodeSubgraph(nodeId: string, hops: number, context: GraphContext): IGraphData {
  return facadeGetSubgraph(nodeId, hops, context.graphProvider);
}

export function findNodePath(
  fromId: string,
  toId: string,
  context: GraphContext,
): IGraphNode[] | null {
  return facadeFindPath(fromId, toId, context.graphProvider);
}
