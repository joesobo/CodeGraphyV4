/**
 * @fileoverview Graph building helpers for workspace analysis.
 * @module extension/workspaceGraphData
 */

import * as path from 'path';
import { IConnection, IPlugin } from '../core/plugins';
import { DEFAULT_NODE_COLOR, IGraphData, IGraphEdge, IGraphNode } from '../shared/types';

export interface IWorkspaceGraphDataOptions {
  cacheFiles: Record<string, { size?: number }>;
  disabledPlugins: ReadonlySet<string>;
  disabledRules: ReadonlySet<string>;
  fileConnections: ReadonlyMap<string, IConnection[]>;
  showOrphans: boolean;
  visitCounts: Record<string, number>;
  workspaceRoot: string;
  getPluginForFile: (absolutePath: string) => IPlugin | undefined;
}

export function buildWorkspaceGraphData(options: IWorkspaceGraphDataOptions): IGraphData {
  const {
    cacheFiles,
    disabledPlugins,
    disabledRules,
    fileConnections,
    showOrphans,
    visitCounts,
    workspaceRoot,
    getPluginForFile,
  } = options;

  const nodes: IGraphNode[] = [];
  const edges: IGraphEdge[] = [];
  const nodeIds = new Set<string>();
  const connectedIds = new Set<string>();
  const edgeMap = new Map<string, IGraphEdge>();

  for (const [filePath, connections] of fileConnections) {
    nodeIds.add(filePath);

    const plugin = getPluginForFile(path.join(workspaceRoot, filePath));
    if (plugin && disabledPlugins.has(plugin.id)) {
      continue;
    }

    for (const connection of connections) {
      if (plugin && connection.ruleId) {
        const qualifiedId = `${plugin.id}:${connection.ruleId}`;
        if (disabledRules.has(qualifiedId)) {
          continue;
        }
      }

      if (!connection.resolvedPath) {
        continue;
      }

      const targetRelative = path.relative(workspaceRoot, connection.resolvedPath);
      if (!fileConnections.has(targetRelative)) {
        continue;
      }

      connectedIds.add(filePath);
      connectedIds.add(targetRelative);

      const edgeId = `${filePath}->${targetRelative}`;
      const qualifiedRuleId = plugin && connection.ruleId
        ? `${plugin.id}:${connection.ruleId}`
        : undefined;
      const existing = edgeMap.get(edgeId);

      if (!existing) {
        const edge: IGraphEdge = {
          id: edgeId,
          from: filePath,
          to: targetRelative,
        };

        if (qualifiedRuleId) {
          edge.ruleIds = [qualifiedRuleId];
        }

        edges.push(edge);
        edgeMap.set(edgeId, edge);
        continue;
      }

      if (
        qualifiedRuleId
        && (!existing.ruleIds || !existing.ruleIds.includes(qualifiedRuleId))
      ) {
        if (!existing.ruleIds) {
          existing.ruleIds = [];
        }

        existing.ruleIds.push(qualifiedRuleId);
      }
    }
  }

  for (const filePath of nodeIds) {
    if (!showOrphans && !connectedIds.has(filePath)) {
      continue;
    }

    nodes.push({
      id: filePath,
      label: path.basename(filePath),
      color: DEFAULT_NODE_COLOR,
      fileSize: cacheFiles[filePath]?.size,
      accessCount: visitCounts[filePath] ?? 0,
    });
  }

  return { nodes, edges };
}
