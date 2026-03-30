/**
 * @fileoverview Edge-building helpers for workspace graph data.
 * @module extension/workspaceGraphEdges
 */

import * as path from 'path';
import type { IConnection, IPlugin } from '../../../core/plugins/types/contracts';
import type { IGraphEdge } from '../../../shared/graph/types';

export interface IWorkspaceGraphEdgesOptions {
  disabledPlugins: ReadonlySet<string>;
  disabledRules: ReadonlySet<string>;
  fileConnections: ReadonlyMap<string, IConnection[]>;
  getPluginForFile: (absolutePath: string) => IPlugin | undefined;
  workspaceRoot: string;
}

export interface IWorkspaceGraphEdgeBuildResult {
  connectedIds: Set<string>;
  edges: IGraphEdge[];
  nodeIds: Set<string>;
}

function createQualifiedRuleId(
  plugin: IPlugin | undefined,
  connection: Pick<IConnection, 'ruleId'>,
): string | undefined {
  return plugin && connection.ruleId ? `${plugin.id}:${connection.ruleId}` : undefined;
}

export function buildWorkspaceGraphEdges(
  options: IWorkspaceGraphEdgesOptions,
): IWorkspaceGraphEdgeBuildResult {
  const {
    disabledPlugins,
    disabledRules,
    fileConnections,
    getPluginForFile,
    workspaceRoot,
  } = options;

  const connectedIds = new Set<string>();
  const edgeMap = new Map<string, IGraphEdge>();
  const edges: IGraphEdge[] = [];
  const nodeIds = new Set<string>();

  for (const [filePath, connections] of fileConnections) {
    nodeIds.add(filePath);

    const plugin = getPluginForFile(path.join(workspaceRoot, filePath));
    if (plugin && disabledPlugins.has(plugin.id)) {
      continue;
    }

    for (const connection of connections) {
      const qualifiedRuleId = createQualifiedRuleId(plugin, connection);
      if (qualifiedRuleId && disabledRules.has(qualifiedRuleId)) {
        continue;
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
        qualifiedRuleId &&
        (!existing.ruleIds || !existing.ruleIds.includes(qualifiedRuleId))
      ) {
        if (!existing.ruleIds) {
          existing.ruleIds = [];
        }

        existing.ruleIds.push(qualifiedRuleId);
      }
    }
  }

  return {
    connectedIds,
    edges,
    nodeIds,
  };
}
