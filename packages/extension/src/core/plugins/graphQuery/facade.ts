import type { IGraphData } from '../../../shared/graph/contracts';
import { filterEdgesByKind, getEdgesFor, getIncomingEdges, getOutgoingEdges } from './edges';
import { getGraph, getNeighbors, getNode } from './nodes';
import { findNodePath } from './path';
import { buildSubgraph } from './subgraph';

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
