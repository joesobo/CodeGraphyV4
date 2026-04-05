/**
 * @fileoverview Edge-building helpers for workspace graph data.
 * @module extension/workspaceGraphEdges
 */

import * as path from 'path';
import type { IConnection, IPlugin } from '../../../core/plugins/types/contracts';
import type { IGraphEdge, IGraphEdgeSource } from '../../../shared/graph/types';

export interface IWorkspaceGraphEdgesOptions {
  disabledPlugins: ReadonlySet<string>;
  disabledSources: ReadonlySet<string>;
  fileConnections: ReadonlyMap<string, IConnection[]>;
  getPluginForFile: (absolutePath: string) => IPlugin | undefined;
  workspaceRoot: string;
}

export interface IWorkspaceGraphEdgeBuildResult {
  connectedIds: Set<string>;
  edges: IGraphEdge[];
  nodeIds: Set<string>;
}

function createQualifiedSourceId(
  plugin: IPlugin | undefined,
  connection: Pick<IConnection, 'sourceId'>,
): string | undefined {
  return plugin && connection.sourceId ? `${plugin.id}:${connection.sourceId}` : undefined;
}

function createEdgeSource(
  plugin: IPlugin | undefined,
  connection: IConnection,
): IGraphEdgeSource | undefined {
  if (!plugin) {
    return undefined;
  }

  const qualifiedSourceId = createQualifiedSourceId(plugin, connection);
  if (!qualifiedSourceId) {
    return undefined;
  }

  const pluginSource = plugin.sources?.find((source) => source.id === connection.sourceId);

  return {
    id: qualifiedSourceId,
    pluginId: plugin.id,
    sourceId: connection.sourceId,
    label: pluginSource?.name ?? connection.sourceId,
    metadata: connection.metadata,
    variant: connection.variant,
  };
}

export function buildWorkspaceGraphEdges(
  options: IWorkspaceGraphEdgesOptions,
): IWorkspaceGraphEdgeBuildResult {
  const {
    disabledPlugins,
    disabledSources,
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
      const qualifiedSourceId = createQualifiedSourceId(plugin, connection);
      if (qualifiedSourceId && disabledSources.has(qualifiedSourceId)) {
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

      const edgeId = `${filePath}->${targetRelative}#${connection.kind}`;
      const existing = edgeMap.get(edgeId);
      const edgeSource = createEdgeSource(plugin, connection);

      if (!existing) {
        const edge: IGraphEdge = {
          id: edgeId,
          from: filePath,
          to: targetRelative,
          kind: connection.kind,
          sources: edgeSource ? [edgeSource] : [],
        };

        edges.push(edge);
        edgeMap.set(edgeId, edge);
        continue;
      }

      if (
        edgeSource &&
        !existing.sources.some((source) => source.id === edgeSource.id)
      ) {
        existing.sources.push(edgeSource);
      }
    }
  }

  return {
    connectedIds,
    edges,
    nodeIds,
  };
}
