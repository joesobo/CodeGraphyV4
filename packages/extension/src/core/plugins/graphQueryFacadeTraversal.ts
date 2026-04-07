import type { IGraphData, IGraphNode } from '../../shared/graph/types';
import type { GraphDataGetter } from './graphQueryFacade';
import { findNodePath } from './graphQueryFacadePath';
import { buildSubgraph } from './graphQueryFacadeSubgraph';

export function getSubgraph(
  nodeId: string,
  hops: number,
  getGraphData: GraphDataGetter,
): IGraphData {
  return buildSubgraph(nodeId, hops, getGraphData);
}

export function findPath(
  fromId: string,
  toId: string,
  getGraphData: GraphDataGetter,
): IGraphNode[] | null {
  return findNodePath(fromId, toId, getGraphData);
}
