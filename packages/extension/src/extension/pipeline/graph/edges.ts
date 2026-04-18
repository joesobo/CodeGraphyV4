/**
 * @fileoverview Edge-building helpers for workspace graph data.
 * @module extension/workspaceGraphEdges
 */

import * as path from 'path';
import type { IProjectedConnection, IPlugin } from '../../../core/plugins/types/contracts';
import type { IGraphEdge } from '../../../shared/graph/contracts';
import { createGraphEdgeId } from '../../../shared/graph/edgeIdentity';
import { createEdgeSource } from './edgeSources';
import { getConnectionTargetId } from './edgeTargets';

export interface IWorkspaceGraphEdgesOptions {
  disabledPlugins: ReadonlySet<string>;
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>;
  getPluginForFile: (absolutePath: string) => IPlugin | undefined;
  workspaceRoot: string;
}

export interface IWorkspaceGraphEdgeBuildResult {
  connectedIds: Set<string>;
  edges: IGraphEdge[];
  nodeIds: Set<string>;
}

function appendEdgeSource(
  edge: IGraphEdge,
  edgeSource: NonNullable<IGraphEdge['sources'][number]> | null | undefined,
): void {
  if (!edgeSource || edge.sources.some((source) => source.id === edgeSource.id)) {
    return;
  }

  edge.sources.push(edgeSource);
}

function appendConnectionEdge(
  filePath: string,
  connection: IProjectedConnection,
  options: {
    connectedIds: Set<string>;
    disabledPlugins: ReadonlySet<string>;
    edgeMap: Map<string, IGraphEdge>;
    edges: IGraphEdge[];
    fileConnections: ReadonlyMap<string, IProjectedConnection[]>;
    nodeIds: Set<string>;
    plugin: IPlugin | undefined;
    workspaceRoot: string;
  },
): void {
  const sourcePluginId = connection.pluginId ?? options.plugin?.id;
  if (sourcePluginId && options.disabledPlugins.has(sourcePluginId)) {
    return;
  }

  const targetId = getConnectionTargetId(
    options.plugin,
    connection,
    options.fileConnections,
    options.workspaceRoot,
  );
  if (!targetId) {
    return;
  }

  options.connectedIds.add(filePath);
  options.connectedIds.add(targetId);
  options.nodeIds.add(targetId);

  const edgeId = createGraphEdgeId({
    from: filePath,
    to: targetId,
    kind: connection.kind,
    type: connection.type,
    variant: connection.variant,
  });
  const existing = options.edgeMap.get(edgeId);
  const edgeSource = createEdgeSource(options.plugin, connection);
  if (existing) {
    appendEdgeSource(existing, edgeSource);
    return;
  }

  const edge: IGraphEdge = {
    id: edgeId,
    from: filePath,
    to: targetId,
    kind: connection.kind,
    sources: edgeSource ? [edgeSource] : [],
  };

  options.edges.push(edge);
  options.edgeMap.set(edgeId, edge);
}

export function buildWorkspaceGraphEdges(
  options: IWorkspaceGraphEdgesOptions,
): IWorkspaceGraphEdgeBuildResult {
  const {
    disabledPlugins,
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

    for (const connection of connections) {
      appendConnectionEdge(filePath, connection, {
        connectedIds,
        disabledPlugins,
        edgeMap,
        edges,
        fileConnections,
        nodeIds,
        plugin,
        workspaceRoot,
      });
    }
  }

  return {
    connectedIds,
    edges,
    nodeIds,
  };
}
