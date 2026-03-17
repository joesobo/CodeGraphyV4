import type { IGraphData, IGroup, IPluginStatus } from '../../shared/types';
import { graphStore } from '../store';
import { postMessage } from '../vscodeApi';
import { createExportTimestamp, getExportContext } from './exportContext';
import { buildGroupedSections } from './jsonGroups';
import { buildConnectionData, buildRuleLookups } from './jsonRules';
import type { ExportBuildContext, ExportData } from './types';

export { UNATTRIBUTED_RULE_KEY } from './types';
export type {
  ExportBuildContext,
  ExportConnectionsSection,
  ExportData,
  ExportFile,
  ExportGroup,
  ExportImagesSectionEntry,
  ExportRule,
} from './types';

export function exportAsJson(data: IGraphData): void {
  try {
    const { groups, pluginStatuses } = graphStore.getState();
    const exportData = buildExportData(data, groups, pluginStatuses, getExportContext());
    const timestamp = createExportTimestamp();

    postMessage({
      type: 'EXPORT_JSON',
      payload: {
        json: JSON.stringify(exportData, null, 2),
        filename: `codegraphy-connections-${timestamp}.json`,
      },
    });
  } catch (error) {
    console.error('[CodeGraphy] JSON export failed:', error);
  }
}

/**
 * Build a structured export of the graph's connection data.
 *
 * The output is designed to be easy for both humans and agents to parse,
 * while reflecting exactly what is currently rendered in the graph.
 */
export function buildExportData(
  graphData: IGraphData,
  groups: IGroup[],
  pluginStatuses: IPluginStatus[] = [],
  context: ExportBuildContext = {},
): ExportData {
  const lookups = buildRuleLookups(pluginStatuses);
  const { importsMap, rulesRecord } = buildConnectionData(graphData.edges, lookups);
  const { groupsRecord, ungroupedFiles, imagesRecord } = buildGroupedSections(graphData.nodes, groups, importsMap);

  return {
    format: 'codegraphy-export',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    scope: {
      graph: 'current-view',
      timeline: {
        active: Boolean(context.timelineActive),
        commitSha: context.timelineActive ? (context.currentCommitSha ?? null) : null,
      },
    },
    summary: {
      totalFiles: graphData.nodes.length,
      totalConnections: graphData.edges.length,
      totalRules: Object.keys(rulesRecord).length,
      totalGroups: Object.keys(groupsRecord).length,
      totalImages: Object.keys(imagesRecord).length,
    },
    sections: {
      connections: {
        rules: rulesRecord,
        groups: groupsRecord,
        ungrouped: ungroupedFiles,
      },
      images: imagesRecord,
    },
  };
}
