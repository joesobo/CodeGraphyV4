import type { IGraphData, IGroup, IPluginStatus } from '../../shared/types';
import { globMatch } from './globMatch';

export interface ExportGroup {
  pattern: string;
  color: string;
  shape2D?: string;
  shape3D?: string;
  imagePath?: string;
  files: Record<string, ExportFile>;
}

/** imports keyed by rule qualifiedId → list of target file paths */
export interface ExportFile {
  imports?: Record<string, string[]>;
}

export interface ExportRule {
  name: string;
  plugin: string;
  connections: number;
}

export interface ExportData {
  format: 'codegraphy-connections';
  version: '1.0';
  exportedAt: string;
  stats: { totalFiles: number; totalConnections: number };
  rules: Record<string, ExportRule>;
  groups: Record<string, ExportGroup>;
  ungrouped: Record<string, ExportFile>;
}

/**
 * Build a structured export of the graph's connection data.
 *
 * The output is designed to be useful for AI/LLM agents trying to
 * understand a repository's dependency structure.
 */
export function buildExportData(
  graphData: IGraphData,
  groups: IGroup[],
  pluginStatuses: IPluginStatus[] = [],
): ExportData {
  // Build rules lookup from plugin statuses (qualifiedId → ExportRule)
  const rulesRecord: Record<string, ExportRule> = {};
  for (const plugin of pluginStatuses) {
    if (!plugin.enabled) continue;
    for (const rule of plugin.rules) {
      if (!rule.enabled || rule.connectionCount === 0) continue;
      rulesRecord[rule.qualifiedId] = {
        name: rule.name,
        plugin: plugin.name,
        connections: rule.connectionCount,
      };
    }
  }

  // Build imports map: nodeId → Record<ruleKey, targetFiles[]>
  const importsMap = new Map<string, Record<string, string[]>>();
  for (const edge of graphData.edges) {
    let ruleKeys: string[];
    if (edge.ruleIds && edge.ruleIds.length > 0) {
      ruleKeys = edge.ruleIds.filter(r => r in rulesRecord);
      if (ruleKeys.length === 0) ruleKeys = [''];
    } else {
      ruleKeys = [''];
    }

    let fileImports = importsMap.get(edge.from);
    if (!fileImports) {
      fileImports = {};
      importsMap.set(edge.from, fileImports);
    }

    for (const key of ruleKeys) {
      if (!fileImports[key]) fileImports[key] = [];
      fileImports[key].push(edge.to);
    }
  }

  // Active (non-disabled) groups only
  const activeGroups = groups.filter(g => !g.disabled);

  // Match each node to its first matching group (first-match-wins, same as rendering)
  const nodeGroupMap = new Map<string, string>();

  const sorted = [...graphData.nodes].sort((a, b) => a.id.localeCompare(b.id));

  for (const node of sorted) {
    for (const group of activeGroups) {
      if (globMatch(node.id, group.pattern)) {
        nodeGroupMap.set(node.id, group.pattern);
        break;
      }
    }
  }

  // Build groups with nested files
  const groupsRecord: Record<string, ExportGroup> = {};
  const ungroupedFiles: Record<string, ExportFile> = {};

  for (const node of sorted) {
    const nodeImports = importsMap.get(node.id);
    const file: ExportFile = nodeImports ? { imports: nodeImports } : {};
    const groupPattern = nodeGroupMap.get(node.id);

    if (groupPattern) {
      if (!groupsRecord[groupPattern]) {
        const group = activeGroups.find(g => g.pattern === groupPattern)!;
        const entry: ExportGroup = {
          pattern: group.pattern,
          color: group.color,
          files: {},
        };
        if (group.shape2D && group.shape2D !== 'circle') entry.shape2D = group.shape2D;
        if (group.shape3D && group.shape3D !== 'sphere') entry.shape3D = group.shape3D;
        if (group.imagePath) entry.imagePath = group.imagePath;
        groupsRecord[groupPattern] = entry;
      }
      groupsRecord[groupPattern].files[node.id] = file;
    } else {
      ungroupedFiles[node.id] = file;
    }
  }

  return {
    format: 'codegraphy-connections',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    stats: {
      totalFiles: graphData.nodes.length,
      totalConnections: graphData.edges.length,
    },
    rules: rulesRecord,
    groups: groupsRecord,
    ungrouped: ungroupedFiles,
  };
}
