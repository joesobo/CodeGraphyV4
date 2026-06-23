/**
 * @fileoverview Edge-building helpers for workspace graph data.
 * @module core/workspaceGraphEdges
 */

import * as path from 'path';
import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../analysis/projectedConnection';
import type { IGraphEdge } from './contracts';
import { createGraphEdgeId } from './edgeIdentity';
import { createEdgeSource } from './edgeSources';
import { getConnectionTargetId } from './edgeTargets';
import {
  createCachedConnectionTargetResolver,
  type ConnectionTargetResolver,
} from './edgeTargetCache.js';

export interface IWorkspaceGraphEdgesOptions {
  disabledPlugins: ReadonlySet<string>;
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>;
  getConnectionTargetId?: ConnectionTargetResolver;
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
    nodeIds: Set<string>;
    plugin: IPlugin | undefined;
    resolveConnectionTargetId: (plugin: IPlugin | undefined, connection: IProjectedConnection) => string | null;
  },
): void {
  const sourcePluginId = connection.pluginId;
  if (sourcePluginId && options.disabledPlugins.has(sourcePluginId)) {
    return;
  }

  const targetId = options.resolveConnectionTargetId(
    options.plugin,
    connection,
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
    getConnectionTargetId: resolveConnectionTargetId = getConnectionTargetId,
    getPluginForFile,
    workspaceRoot,
  } = options;

  const connectedIds = new Set<string>();
  const edgeMap = new Map<string, IGraphEdge>();
  const edges: IGraphEdge[] = [];
  const nodeIds = new Set<string>();
  const resolveTarget = createCachedConnectionTargetResolver(
    resolveConnectionTargetId,
    fileConnections,
    workspaceRoot,
  );

  for (const [filePath, connections] of fileConnections) {
    nodeIds.add(filePath);

    const plugin = getPluginForFile(path.join(workspaceRoot, filePath));

    for (const connection of connections) {
      appendConnectionEdge(filePath, connection, {
        connectedIds,
        disabledPlugins,
        edgeMap,
        edges,
        nodeIds,
        plugin,
        resolveConnectionTargetId: resolveTarget,
      });
    }
  }

  return {
    connectedIds,
    edges,
    nodeIds,
  };
}
