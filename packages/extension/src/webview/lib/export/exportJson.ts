import type { IGraphData, IGroup, IPluginStatus } from '../../../shared/types';
import { graphStore } from '../../store';
import { globMatch } from '../globMatch';
import { postMessage } from '../vscodeApi';
import { createExportTimestamp, getExportContext } from './common';

export const UNATTRIBUTED_RULE_KEY = 'unattributed';

export interface ExportBuildContext {
  timelineActive?: boolean;
  currentCommitSha?: string | null;
}

export interface ExportFile {
  imports?: Record<string, string[]>;
}

export interface ExportRule {
  name: string;
  plugin: string;
  connections: number;
}

export interface ExportGroup {
  style: {
    color: string;
    shape2D?: string;
    shape3D?: string;
    image?: string;
  };
  files: Record<string, ExportFile>;
}

export interface ExportConnectionsSection {
  rules: Record<string, ExportRule>;
  groups: Record<string, ExportGroup>;
  ungrouped: Record<string, ExportFile>;
}

export interface ExportImagesSectionEntry {
  groups: string[];
}

export interface ExportData {
  format: 'codegraphy-export';
  version: '2.0';
  exportedAt: string;
  scope: {
    graph: 'current-view';
    timeline: {
      active: boolean;
      commitSha: string | null;
    };
  };
  summary: {
    totalFiles: number;
    totalConnections: number;
    totalRules: number;
    totalGroups: number;
    totalImages: number;
  };
  sections: {
    connections: ExportConnectionsSection;
    images: Record<string, ExportImagesSectionEntry>;
  };
}

interface RuleMeta {
  name: string;
  plugin: string;
}

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
  const ruleMetaByQualified: Record<string, RuleMeta> = {};
  const qualifiedByRuleId = new Map<string, string[]>();

  // Build rule metadata lookup from plugin statuses.
  for (const plugin of pluginStatuses) {
    for (const rule of plugin.rules) {
      ruleMetaByQualified[rule.qualifiedId] = {
        name: rule.name,
        plugin: plugin.name,
      };
      const list = qualifiedByRuleId.get(rule.id);
      if (list) {
        list.push(rule.qualifiedId);
      } else {
        qualifiedByRuleId.set(rule.id, [rule.qualifiedId]);
      }
    }
  }

  const importsMap = new Map<string, Record<string, string[]>>();
  const ruleConnectionCounts = new Map<string, number>();

  for (const edge of graphData.edges) {
    const ruleKeys = resolveRuleKeys(edge, qualifiedByRuleId);

    let fileImports = importsMap.get(edge.from);
    if (!fileImports) {
      fileImports = {};
      importsMap.set(edge.from, fileImports);
    }

    for (const key of ruleKeys) {
      if (!fileImports[key]) fileImports[key] = [];
      fileImports[key].push(edge.to);

      if (key !== UNATTRIBUTED_RULE_KEY) {
        ruleConnectionCounts.set(key, (ruleConnectionCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const rulesRecord: Record<string, ExportRule> = {};
  const sortedRuleKeys = Array.from(ruleConnectionCounts.keys()).sort();
  for (const key of sortedRuleKeys) {
    const meta = ruleMetaByQualified[key];
    const fallbackName = key.includes(':') ? key.split(':').slice(1).join(':') : key;
    const fallbackPlugin = key.includes(':') ? key.split(':')[0] : 'unknown';
    rulesRecord[key] = {
      name: meta?.name ?? fallbackName,
      plugin: meta?.plugin ?? fallbackPlugin,
      connections: ruleConnectionCounts.get(key) ?? 0,
    };
  }

  const activeGroups = groups.filter(g => !g.disabled);
  const sortedNodes = [...graphData.nodes].sort((na, nb) => na.id.localeCompare(nb.id));

  // Match each node to its first matching group (same first-match-wins semantics as rendering).
  const nodeGroupMap = new Map<string, string>();
  for (const node of sortedNodes) {
    for (const group of activeGroups) {
      if (globMatch(node.id, group.pattern)) {
        nodeGroupMap.set(node.id, group.pattern);
        break;
      }
    }
  }

  const groupedFileMaps = new Map<string, Record<string, ExportFile>>();
  const ungroupedFiles: Record<string, ExportFile> = {};

  for (const node of sortedNodes) {
    const nodeImports = importsMap.get(node.id);
    const file: ExportFile = nodeImports ? { imports: nodeImports } : {};
    const groupPattern = nodeGroupMap.get(node.id);

    if (!groupPattern) {
      ungroupedFiles[node.id] = file;
      continue;
    }

    const fileMap = groupedFileMaps.get(groupPattern);
    if (fileMap) {
      fileMap[node.id] = file;
    } else {
      groupedFileMaps.set(groupPattern, { [node.id]: file });
    }
  }

  const groupsRecord: Record<string, ExportGroup> = {};
  const imagesRecord: Record<string, ExportImagesSectionEntry> = {};

  for (const group of activeGroups) {
    const files = groupedFileMaps.get(group.pattern);
    if (!files) continue;

    const style: ExportGroup['style'] = {
      color: group.color,
    };
    if (group.shape2D && group.shape2D !== 'circle') style.shape2D = group.shape2D;
    if (group.shape3D && group.shape3D !== 'sphere') style.shape3D = group.shape3D;
    if (group.imagePath) style.image = group.imagePath;

    groupsRecord[group.pattern] = {
      style,
      files,
    };

    if (group.imagePath) {
      if (!imagesRecord[group.imagePath]) {
        imagesRecord[group.imagePath] = { groups: [] };
      }
      imagesRecord[group.imagePath].groups.push(group.pattern);
    }
  }

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

function resolveRuleKeys(
  edge: { ruleIds?: string[]; ruleId?: string },
  qualifiedByRuleId: Map<string, string[]>,
): string[] {
  if (Array.isArray(edge.ruleIds) && edge.ruleIds.length > 0) {
    return edge.ruleIds;
  }

  if (edge.ruleId) {
    const qualified = qualifiedByRuleId.get(edge.ruleId);
    if (qualified && qualified.length === 1) {
      return [qualified[0]];
    }

    // Keep unqualified ID when metadata is missing or ambiguous.
    return [edge.ruleId];
  }

  return [UNATTRIBUTED_RULE_KEY];
}
