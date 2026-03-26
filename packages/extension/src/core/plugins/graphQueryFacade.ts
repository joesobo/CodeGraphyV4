/**
 * @fileoverview Pure graph query functions used by the plugin API.
 * Each function takes a graph data getter so it can be unit-tested
 * without a full API instance.
 * @module core/plugins/graphQueryFacade
 */

import { IGraphData, IGraphNode, IGraphEdge } from '../../shared/contracts';

/** Function that provides current graph data. */
export type GraphDataGetter = () => IGraphData;

/**
 * Returns the full graph snapshot.
 */
export function getGraph(getGraphData: GraphDataGetter): IGraphData {
  return getGraphData();
}

/**
 * Returns the node with the given id, or null if not found.
 */
export function getNode(id: string, getGraphData: GraphDataGetter): IGraphNode | null {
  const graph = getGraphData();
  return graph.nodes.find((n) => n.id === id) ?? null;
}

/**
 * Returns all nodes directly connected to the node with the given id.
 */
export function getNeighbors(id: string, getGraphData: GraphDataGetter): IGraphNode[] {
  const graph = getGraphData();
  const neighborIds = new Set<string>();

  for (const edge of graph.edges) {
    if (edge.from === id) neighborIds.add(edge.to);
    if (edge.to === id) neighborIds.add(edge.from);
  }

  return graph.nodes.filter((n) => neighborIds.has(n.id));
}

/**
 * Returns all edges that involve the node with the given id.
 */
export function getEdgesFor(nodeId: string, getGraphData: GraphDataGetter): IGraphEdge[] {
  const graph = getGraphData();
  return graph.edges.filter((e) => e.from === nodeId || e.to === nodeId);
}
