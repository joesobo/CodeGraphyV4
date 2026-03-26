import * as path from 'path';
import type { IGraphData } from '../../../shared/contracts';

interface GraphViewTimelineRegistry {
  getPluginForFile(filePath: string): { id: string } | undefined;
}

export interface GraphViewTimelineGraphOptions {
  disabledPlugins: ReadonlySet<string>;
  disabledRules: ReadonlySet<string>;
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
    options.disabledRules.size === 0
  ) {
    return rawGraphData.edges;
  }

  if (!options.registry || !options.workspaceRoot) {
    return rawGraphData.edges;
  }

  const { registry, workspaceRoot } = options;

  return rawGraphData.edges.filter((edge) => {
    const plugin = registry.getPluginForFile(path.join(workspaceRoot, edge.from));
    if (!plugin) return true;
    if (options.disabledPlugins.has(plugin.id)) return false;
    if (edge.ruleId && options.disabledRules.has(`${plugin.id}:${edge.ruleId}`)) return false;
    return true;
  });
}
