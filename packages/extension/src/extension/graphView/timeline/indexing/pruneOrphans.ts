import type { IGraphData } from '../../../../shared/graph/contracts';

export function pruneGraphViewTimelineOrphans(
  rawGraphData: IGraphData,
  edges: IGraphData['edges'],
): IGraphData {
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.from);
    connectedIds.add(edge.to);
  }

  return {
    nodes: rawGraphData.nodes.filter((node) => connectedIds.has(node.id)),
    edges,
  };
}
