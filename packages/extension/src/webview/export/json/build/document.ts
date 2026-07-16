import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IPluginStatus } from '../../../../shared/plugins/status';
import type { IGroup } from '../../../../shared/settings/groups';
import type { ExportData } from '../../shared/contracts';
import { buildExportEdges } from './edges';
import { buildExportLegend } from './legend';
import { buildExportNodes } from './nodes';

function buildExportSummary(
  nodes: ReturnType<typeof buildExportNodes>,
  edges: ReturnType<typeof buildExportEdges>,
  legend: ReturnType<typeof buildExportLegend>,
) {
  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    totalLegendRules: legend.length,
    totalImages: legend.filter((rule) => rule.imagePath).length,
  };
}

export function buildExportData(
  graphData: IGraphData,
  legends: IGroup[],
  pluginStatuses: IPluginStatus[] = [],
): ExportData {
  const activeLegendRules = legends.filter((group) => !group.disabled);
  const pluginNames = new Map(pluginStatuses.map((plugin) => [plugin.id, plugin.name]));
  const legend = buildExportLegend(activeLegendRules);
  const nodes = buildExportNodes(graphData, activeLegendRules);
  const edges = buildExportEdges(graphData, activeLegendRules, pluginNames);

  return {
    format: 'codegraphy-export',
    version: '3.0',
    exportedAt: new Date().toISOString(),
    scope: {
      graph: 'current-view',
    },
    summary: buildExportSummary(nodes, edges, legend),
    legend,
    nodes,
    edges,
  };
}
