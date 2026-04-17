import type { IGraphData } from '../../../shared/graph/contracts';
import { filterEdgesByKind, getEdgesFor, getIncomingEdges, getOutgoingEdges } from './read/edges';
import { getGraph, getNeighbors, getNode } from './read/nodes';
import { findNodePath } from './traversal/path';
import { buildSubgraph } from './traversal/subgraph';

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
