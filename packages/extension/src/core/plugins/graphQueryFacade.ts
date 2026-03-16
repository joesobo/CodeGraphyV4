/**
 * @fileoverview Pure graph query functions extracted from CodeGraphyAPI.
 * These functions take a graph data getter as a parameter and are stateless.
 * @module core/plugins/graphQueryFacade
 */

import { IGraphData, IGraphNode, IGraphEdge } from '../../shared/types';
import { GraphDataProvider } from './CodeGraphyAPI';

/**
 * Returns the full current graph snapshot.
 */
export function getGraph(graphProvider: GraphDataProvider): IGraphData {
  return graphProvider();
}

/**
 * Returns the node with the given ID, or null if not found.
 */
export function getNode(id: string, graphProvider: GraphDataProvider): IGraphNode | null {
  const graph = graphProvider();
  return graph.nodes.find((n) => n.id === id) ?? null;
}

/**
 * Returns all nodes directly connected to the node with the given ID.
 */
export function getNeighbors(id: string, graphProvider: GraphDataProvider): IGraphNode[] {
  const graph = graphProvider();
  const neighborIds = new Set<string>();

  for (const edge of graph.edges) {
    if (edge.from === id) neighborIds.add(edge.to);
    if (edge.to === id) neighborIds.add(edge.from);
  }

  return graph.nodes.filter((n) => neighborIds.has(n.id));
}

/**
 * Returns all edges incident to the node with the given ID (as source or target).
 */
export function getEdgesFor(nodeId: string, graphProvider: GraphDataProvider): IGraphEdge[] {
  const graph = graphProvider();
  return graph.edges.filter((e) => e.from === nodeId || e.to === nodeId);
}
