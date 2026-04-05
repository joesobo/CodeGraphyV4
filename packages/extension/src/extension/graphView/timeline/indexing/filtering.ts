import * as path from 'path';
import type { IGraphData } from '../../../../shared/graph/types';

interface GraphViewTimelineRegistry {
  getPluginForFile(filePath: string): { id: string } | undefined;
}

export interface GraphViewTimelineGraphOptions {
  disabledPlugins: ReadonlySet<string>;
  disabledSources: ReadonlySet<string>;
  showOrphans: boolean;
  workspaceRoot?: string;
  registry?: GraphViewTimelineRegistry;
}

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

function filterGraphViewTimelineEdges(
  rawGraphData: IGraphData,
  options: GraphViewTimelineGraphOptions,
) {
  if (
    options.disabledPlugins.size === 0 &&
    options.disabledSources.size === 0
  ) {
    return rawGraphData.edges;
  }

  if (!options.registry || !options.workspaceRoot) {
    return rawGraphData.edges;
  }

  const { registry, workspaceRoot } = options;

  return rawGraphData.edges.flatMap((edge) => {
    const plugin = registry.getPluginForFile(path.join(workspaceRoot, edge.from));
    if (!plugin) return [edge];
    if (options.disabledPlugins.has(plugin.id)) return [];

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
