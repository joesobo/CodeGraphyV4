import type { IGraphData } from '../../../../shared/graph/types';

export interface GraphViewTimelineGraphOptions {
  disabledPlugins: ReadonlySet<string>;
  disabledSources: ReadonlySet<string>;
  showOrphans: boolean;
}

export function filterGraphViewTimelineEdges(
  rawGraphData: IGraphData,
  options: GraphViewTimelineGraphOptions,
) {
  if (options.disabledPlugins.size === 0 && options.disabledSources.size === 0) {
    return rawGraphData.edges;
  }

  return rawGraphData.edges.flatMap((edge) => {
    if (edge.sources.length === 0) {
      return [edge];
    }

    const sources = edge.sources.filter((source) => {
      if (options.disabledPlugins.has(source.pluginId)) {
        return false;
      }

      return !options.disabledSources.has(source.id);
    });

    if (sources.length === 0) {
      return [];
    }

    return [{ ...edge, sources }];
  });
}
