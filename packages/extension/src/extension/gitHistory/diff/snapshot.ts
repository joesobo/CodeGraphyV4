import type { IGraphData, IGraphEdge, IGraphNode } from '../../../shared/graph/types';

export interface DiffGraphSnapshot {
  edgeSet: Set<string>;
  edges: IGraphEdge[];
  nodeMap: Map<string, IGraphNode>;
  nodes: IGraphNode[];
}

export function createDiffGraphSnapshot(previousGraph: IGraphData): DiffGraphSnapshot {
  const nodes = previousGraph.nodes.map((node) => ({ ...node }));
  const edges = previousGraph.edges.map((edge) => ({ ...edge }));

  return {
    edgeSet: new Set(edges.map((edge) => edge.id)),
    edges,
    nodeMap: new Map(nodes.map((node) => [node.id, node])),
    nodes,
  };
}

export function filterDanglingDiffGraphEdges(
  nodes: IGraphNode[],
  edges: IGraphEdge[]
): IGraphEdge[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  return edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
}
