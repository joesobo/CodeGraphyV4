/**
 * @fileoverview Pure graph query functions used by the plugin API.
 * Each function takes a graph data getter so it can be unit-tested
 * without a full API instance.
 * @module core/plugins/graphQueryFacade
 */

import { MultiDirectedGraph } from 'graphology';
import type { GraphEdgeKind, IGraphData, IGraphNode, IGraphEdge } from '../../shared/graph/types';

/** Function that provides current graph data. */
export type GraphDataGetter = () => IGraphData;

interface GraphIndex {
  edgeById: Map<string, IGraphEdge>;
  graph: MultiDirectedGraph<{ node: IGraphNode }, { edge: IGraphEdge }>;
  nodeById: Map<string, IGraphNode>;
}

const graphIndexCache = new WeakMap<IGraphData, GraphIndex>();

function getGraphIndex(graphData: IGraphData): GraphIndex {
  const cached = graphIndexCache.get(graphData);
  if (cached) {
    return cached;
  }

  const graph = new MultiDirectedGraph<{ node: IGraphNode }, { edge: IGraphEdge }>();
  const nodeById = new Map<string, IGraphNode>();
  const edgeById = new Map<string, IGraphEdge>();

  for (const node of graphData.nodes) {
    graph.addNode(node.id, { node });
    nodeById.set(node.id, node);
  }

  for (const edge of graphData.edges) {
    if (!graph.hasNode(edge.from) || !graph.hasNode(edge.to)) {
      continue;
    }

    graph.addDirectedEdgeWithKey(edge.id, edge.from, edge.to, { edge });
    edgeById.set(edge.id, edge);
  }

  const index = { edgeById, graph, nodeById };
  graphIndexCache.set(graphData, index);
  return index;
}

function getEdgesByKeys(
  keys: string[],
  edgeById: Map<string, IGraphEdge>,
): IGraphEdge[] {
  return keys
    .map((key) => edgeById.get(key))
    .filter((edge): edge is IGraphEdge => Boolean(edge));
}

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
  const { nodeById } = getGraphIndex(getGraphData());
  return nodeById.get(id) ?? null;
}

/**
 * Returns all nodes directly connected to the node with the given id.
 */
export function getNeighbors(id: string, getGraphData: GraphDataGetter): IGraphNode[] {
  const { graph, nodeById } = getGraphIndex(getGraphData());
  if (!graph.hasNode(id)) {
    return [];
  }

  return graph.neighbors(id)
    .map((neighborId) => nodeById.get(neighborId))
    .filter((node): node is IGraphNode => Boolean(node));
}

/**
 * Returns all incoming edges for the node with the given id.
 */
export function getIncomingEdges(nodeId: string, getGraphData: GraphDataGetter): IGraphEdge[] {
  const { edgeById, graph } = getGraphIndex(getGraphData());
  if (!graph.hasNode(nodeId)) {
    return [];
  }

  return getEdgesByKeys(graph.inEdges(nodeId), edgeById);
}

/**
 * Returns all outgoing edges for the node with the given id.
 */
export function getOutgoingEdges(nodeId: string, getGraphData: GraphDataGetter): IGraphEdge[] {
  const { edgeById, graph } = getGraphIndex(getGraphData());
  if (!graph.hasNode(nodeId)) {
    return [];
  }

  return getEdgesByKeys(graph.outEdges(nodeId), edgeById);
}

/**
 * Returns all edges that involve the node with the given id.
 */
export function getEdgesFor(nodeId: string, getGraphData: GraphDataGetter): IGraphEdge[] {
  const { edgeById, graph } = getGraphIndex(getGraphData());
  if (!graph.hasNode(nodeId)) {
    return [];
  }

  return getEdgesByKeys(graph.edges(nodeId), edgeById);
}

/**
 * Returns all edges whose kind matches the provided filter.
 */
export function filterEdgesByKind(
  kind: GraphEdgeKind | GraphEdgeKind[],
  getGraphData: GraphDataGetter,
): IGraphEdge[] {
  const graphData = getGraphData();
  const kinds = new Set(Array.isArray(kind) ? kind : [kind]);
  return graphData.edges.filter((edge) => kinds.has(edge.kind));
}

/**
 * Returns an induced subgraph around a seed node for the requested hop depth.
 */
export function getSubgraph(
  nodeId: string,
  hops: number,
  getGraphData: GraphDataGetter,
): IGraphData {
  const graphData = getGraphData();
  const { graph } = getGraphIndex(graphData);
  if (!graph.hasNode(nodeId) || hops < 0) {
    return { nodes: [], edges: [] };
  }

  const queue: Array<{ depth: number; id: string }> = [{ depth: 0, id: nodeId }];
  const visited = new Set<string>([nodeId]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= hops) {
      continue;
    }

    for (const neighborId of graph.neighbors(current.id)) {
      if (visited.has(neighborId)) {
        continue;
      }

      visited.add(neighborId);
      queue.push({ depth: current.depth + 1, id: neighborId });
    }
  }

  return {
    nodes: graphData.nodes.filter((node) => visited.has(node.id)),
    edges: graphData.edges.filter(
      (edge) => visited.has(edge.from) && visited.has(edge.to),
    ),
  };
}

/**
 * Returns the shortest directed path between two nodes, or null when unreachable.
 */
export function findPath(
  fromId: string,
  toId: string,
  getGraphData: GraphDataGetter,
): IGraphNode[] | null {
  const { graph, nodeById } = getGraphIndex(getGraphData());
  if (!graph.hasNode(fromId) || !graph.hasNode(toId)) {
    return null;
  }

  const queue = [fromId];
  const previous = new Map<string, string | null>([[fromId, null]]);

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    if (currentId === toId) {
      break;
    }

    for (const neighborId of graph.outNeighbors(currentId)) {
      if (previous.has(neighborId)) {
        continue;
      }

      previous.set(neighborId, currentId);
      queue.push(neighborId);
    }
  }

  if (!previous.has(toId)) {
    return null;
  }

  const nodeIds: string[] = [];
  let cursor: string | null = toId;
  while (cursor) {
    nodeIds.push(cursor);
    cursor = previous.get(cursor) ?? null;
  }

  return nodeIds
    .reverse()
    .map((id) => nodeById.get(id))
    .filter((node): node is IGraphNode => Boolean(node));
}
