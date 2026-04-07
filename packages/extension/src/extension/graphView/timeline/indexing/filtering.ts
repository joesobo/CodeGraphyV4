import type { IGraphData } from '../../../../shared/graph/types';
import { filterGraphViewTimelineEdges, type GraphViewTimelineGraphOptions } from './edgeFiltering';

export type { GraphViewTimelineGraphOptions } from './edgeFiltering';

export function buildGraphViewTimelineGraphData(
  rawGraphData: IGraphData,
  options: GraphViewTimelineGraphOptions,
): IGraphData {
  const edges = filterGraphViewTimelineEdges(rawGraphData, options);

  if (options.showOrphans) {
    return {
      nodes: rawGraphData.nodes,
      edges,
    };
  }

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
