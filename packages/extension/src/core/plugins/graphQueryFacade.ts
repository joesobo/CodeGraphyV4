import type { IGraphData } from '../../shared/graph/types';
import { filterEdgesByKind, getEdgesFor, getIncomingEdges, getOutgoingEdges } from './graphQueryFacadeEdges';
import { getGraph, getNeighbors, getNode } from './graphQueryFacadeNodes';
import { findNodePath } from './graphQueryFacadePath';
import { buildSubgraph } from './graphQueryFacadeSubgraph';

/** Function that provides current graph data. */
export type GraphDataGetter = () => IGraphData;
export {
  filterEdgesByKind,
  getEdgesFor,
  getGraph,
  getIncomingEdges,
  getNeighbors,
  getNode,
  getOutgoingEdges,
  buildSubgraph as getSubgraph,
  findNodePath as findPath,
};
