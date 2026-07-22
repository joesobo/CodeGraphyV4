import type { IGraphEdge, IGraphNode } from '@codegraphy-dev/core';

export const MINIMUM_NODE_RADIUS = 8;
export const MAXIMUM_NODE_RADIUS = 30;

const CONNECTION_SIZE_SCALE = 3;
const TLDRAW_COORDINATE_SCALE = 5;

export const MINIMUM_NODE_DIAMETER = MINIMUM_NODE_RADIUS * TLDRAW_COORDINATE_SCALE * 2;

function connectionRadius(relatedNodeCount: number): number {
  return Math.min(
    MINIMUM_NODE_RADIUS + CONNECTION_SIZE_SCALE * Math.sqrt(relatedNodeCount),
    MAXIMUM_NODE_RADIUS,
  );
}

function diameterMap(
  nodes: readonly IGraphNode[],
  edges: readonly Pick<IGraphEdge, 'from' | 'to'>[],
  radius: (relatedNodeCount: number) => number,
): ReadonlyMap<string, number> {
  const relatedNodeIds = new Map<string, Set<string>>(
    nodes.map(node => [node.id, new Set<string>()]),
  );
  for (const edge of edges) {
    const sourceRelations = relatedNodeIds.get(edge.from);
    const targetRelations = relatedNodeIds.get(edge.to);
    if (!sourceRelations || !targetRelations) continue;
    sourceRelations.add(edge.to);
    targetRelations.add(edge.from);
  }
  return new Map<string, number>(nodes.map(node => {
    const nodeRadius = radius(relatedNodeIds.get(node.id)?.size ?? 0);
    return [node.id, Math.round(nodeRadius * TLDRAW_COORDINATE_SCALE * 2)];
  }));
}

export function createNodeDiameterMap(
  nodes: readonly IGraphNode[],
  edges: readonly Pick<IGraphEdge, 'from' | 'to'>[],
): ReadonlyMap<string, number> {
  return diameterMap(nodes, edges, connectionRadius);
}
