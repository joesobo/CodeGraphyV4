import type { IGraphEdge, IGraphNode } from '../../../../../shared/graph/contracts';

export const MIN_NODE_SIZE = 8;
export const MAX_NODE_SIZE = 30;

const OBSIDIAN_CONNECTION_SCALE = 3;

function obsidianConnectionSize(relatedNodeCount: number): number {
  return Math.max(
    MIN_NODE_SIZE,
    Math.min(
      OBSIDIAN_CONNECTION_SCALE * Math.sqrt(relatedNodeCount + 1),
      MAX_NODE_SIZE,
    ),
  );
}

/** Returns Obsidian-style sizes from each node's unique related nodes. */
export function computeConnectionSizes(
  nodes: IGraphNode[],
  edges: Pick<IGraphEdge, 'from' | 'to'>[]
): Map<string, number> {
  const relatedNodeIds = new Map(nodes.map(node => [node.id, new Set<string>()]));
  for (const edge of edges) {
    const sourceRelations = relatedNodeIds.get(edge.from);
    const targetRelations = relatedNodeIds.get(edge.to);
    if (!sourceRelations || !targetRelations) continue;
    sourceRelations.add(edge.to);
    targetRelations.add(edge.from);
  }

  return new Map(nodes.map(node => [
    node.id,
    obsidianConnectionSize(relatedNodeIds.get(node.id)?.size ?? 0),
  ]));
}
