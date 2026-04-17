import type { IGraphData } from '../../../../shared/graph/contracts';
import { filterGraphViewTimelineEdges, type GraphViewTimelineGraphOptions } from './edgeFiltering';
import { pruneGraphViewTimelineOrphans } from './pruneOrphans';

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

  return pruneGraphViewTimelineOrphans(rawGraphData, edges);
}
