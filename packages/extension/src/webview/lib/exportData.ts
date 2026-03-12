import type { IGraphData, IGroup } from '../../shared/types';
import { globMatch } from './globMatch';

export interface ExportGroup {
  pattern: string;
  color: string;
  shape2D?: string;
  shape3D?: string;
  imagePath?: string;
}

export interface ExportFile {
  extension: string;
  group?: string;
  imports: string[];
}

export interface ExportData {
  format: 'codegraphy-connections';
  version: '1.0';
  exportedAt: string;
  stats: { totalFiles: number; totalConnections: number };
  groups: Record<string, ExportGroup>;
  files: Record<string, ExportFile>;
}

/**
 * Build a structured export of the graph's connection data.
 *
 * The output is designed to be useful for AI/LLM agents trying to
 * understand a repository's dependency structure.
 */
export function buildExportData(graphData: IGraphData, groups: IGroup[]): ExportData {
  // Build imports map (node id → list of target ids)
  const importsMap = new Map<string, string[]>();
  for (const edge of graphData.edges) {
    const list = importsMap.get(edge.from);
    if (list) {
      list.push(edge.to);
    } else {
      importsMap.set(edge.from, [edge.to]);
    }
  }

  // Active (non-disabled) groups only
  const activeGroups = groups.filter(g => !g.disabled);

  // Match each node to its first matching group (first-match-wins, same as rendering)
  const nodeGroupMap = new Map<string, string>();
  const usedGroupPatterns = new Set<string>();

  const sorted = [...graphData.nodes].sort((a, b) => a.id.localeCompare(b.id));

  for (const node of sorted) {
    for (const group of activeGroups) {
      if (globMatch(node.id, group.pattern)) {
        nodeGroupMap.set(node.id, group.pattern);
        usedGroupPatterns.add(group.pattern);
        break;
      }
    }
  }

  // Only include groups that actually matched at least one node
  const groupsRecord: Record<string, ExportGroup> = {};
  for (const group of activeGroups) {
    if (!usedGroupPatterns.has(group.pattern)) continue;
    const entry: ExportGroup = {
      pattern: group.pattern,
      color: group.color,
    };
    if (group.shape2D && group.shape2D !== 'circle') entry.shape2D = group.shape2D;
    if (group.shape3D && group.shape3D !== 'sphere') entry.shape3D = group.shape3D;
    if (group.imagePath) entry.imagePath = group.imagePath;
    groupsRecord[group.pattern] = entry;
  }

  // Build files record
  const filesRecord: Record<string, ExportFile> = {};
  for (const node of sorted) {
    const ext = node.id.includes('.') ? node.id.slice(node.id.lastIndexOf('.')) : '';
    const entry: ExportFile = {
      extension: ext,
      imports: importsMap.get(node.id) ?? [],
    };
    const groupPattern = nodeGroupMap.get(node.id);
    if (groupPattern) entry.group = groupPattern;
    filesRecord[node.id] = entry;
  }

  return {
    format: 'codegraphy-connections',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    stats: {
      totalFiles: graphData.nodes.length,
      totalConnections: graphData.edges.length,
    },
    groups: groupsRecord,
    files: filesRecord,
  };
}
