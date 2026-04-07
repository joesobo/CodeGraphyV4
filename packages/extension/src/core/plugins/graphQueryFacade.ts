import type { IGraphData } from '../../shared/graph/types';
import { filterEdgesByKind, getEdgesFor, getIncomingEdges, getOutgoingEdges } from './graphQueryFacadeEdges';
import { getGraph, getNeighbors, getNode } from './graphQueryFacadeNodes';
import { findPath, getSubgraph } from './graphQueryFacadeTraversal';

/** Function that provides current graph data. */
export type GraphDataGetter = () => IGraphData;
export {
  filterEdgesByKind,
  findPath,
  getEdgesFor,
  getGraph,
  getIncomingEdges,
  getNeighbors,
  getNode,
  getOutgoingEdges,
  getSubgraph,
};
