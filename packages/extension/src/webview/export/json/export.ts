import type { IGraphData } from '../../../shared/graph/types';
import type { IPluginStatus } from '../../../shared/plugins/status';
import type { IGroup } from '../../../shared/settings/groups';
import { graphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';
import { createExportTimestamp, getExportContext } from '../shared/context';
import { globMatch } from '../../globMatch';
import type { ExportBuildContext, ExportData } from '../shared/contracts';

export type {
  ExportBuildContext,
  ExportData,
  ExportEdgeEntry,
  ExportEdgeSourceEntry,
  ExportLegendRule,
  ExportNodeEntry,
} from '../shared/contracts';

export function exportAsJson(data: IGraphData): void {
  try {
    const { legends, pluginStatuses } = graphStore.getState();
    const exportData = buildExportData(data, legends, pluginStatuses, getExportContext());
    const timestamp = createExportTimestamp();

    postMessage({
      type: 'EXPORT_JSON',
      payload: {
        json: JSON.stringify(exportData, null, 2),
        filename: `codegraphy-graph-${timestamp}.json`,
      },
    });
  } catch (error) {
    console.error('[CodeGraphy] JSON export failed:', error);
  }
}

function buildExportLegend(activeLegendRules: IGroup[]) {
  return activeLegendRules.map((group) => ({
    id: group.id,
    pattern: group.pattern,
    color: group.color,
    target: group.target ?? 'node',
    shape2D: group.shape2D,
    shape3D: group.shape3D,
    imagePath: group.imagePath,
    imageUrl: group.imageUrl,
    disabled: group.disabled,
    isPluginDefault: group.isPluginDefault,
    pluginName: group.pluginName,
  }));
}

function getNodeLegendIds(nodeId: string, activeLegendRules: IGroup[]): string[] {
  return activeLegendRules
    .filter((group) => globMatch(nodeId, group.pattern))
    .map((group) => group.id);
}

function buildExportNodes(graphData: IGraphData, activeLegendRules: IGroup[]) {
  return [...graphData.nodes]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((node) => ({
      id: node.id,
      label: node.label,
      nodeType: node.nodeType ?? 'file',
      color: node.color,
      legendIds: getNodeLegendIds(node.id, activeLegendRules),
      fileSize: node.fileSize,
      accessCount: node.accessCount,
      x: node.x,
      y: node.y,
    }));
}

function getEdgeLegendIds(edge: IGraphData['edges'][number], activeLegendRules: IGroup[]): string[] {
  return activeLegendRules
    .filter((group) => group.target !== 'node')
    .filter((group) =>
      globMatch(edge.id, group.pattern)
      || globMatch(edge.kind, group.pattern)
      || globMatch(`${edge.from}->${edge.to}`, group.pattern)
      || globMatch(`${edge.from}->${edge.to}#${edge.kind}`, group.pattern),
    )
    .map((group) => group.id);
}

function buildExportEdges(
  graphData: IGraphData,
  activeLegendRules: IGroup[],
  pluginNames: ReadonlyMap<string, string>,
) {
  return [...graphData.edges]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      kind: edge.kind,
      color: edge.color,
      legendIds: getEdgeLegendIds(edge, activeLegendRules),
      sources: [...edge.sources]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((source) => ({
          id: source.id,
          pluginId: source.pluginId,
          pluginName: pluginNames.get(source.pluginId),
          sourceId: source.sourceId,
          label: source.label,
          variant: source.variant,
          metadata: source.metadata,
        })),
    }));
}

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

/**
 * Build a structured export of the current graph data.
 *
 * The output is designed to be easy for both humans and agents to parse,
 * while reflecting exactly what is currently rendered in the graph.
 */
export function buildExportData(
  graphData: IGraphData,
  legends: IGroup[],
  pluginStatuses: IPluginStatus[] = [],
  context: ExportBuildContext = {},
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
      timeline: {
        active: Boolean(context.timelineActive),
        commitSha: context.timelineActive ? (context.currentCommitSha ?? null) : null,
      },
    },
    summary: buildExportSummary(nodes, edges, legend),
    legend,
    nodes,
    edges,
  };
}
