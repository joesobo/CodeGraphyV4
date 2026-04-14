/**
 * @fileoverview Edge-building helpers for workspace graph data.
 * @module extension/workspaceGraphEdges
 */

import * as path from 'path';
import type { IProjectedConnection, IPlugin } from '../../../core/plugins/types/contracts';
import type { IGraphEdge } from '../../../shared/graph/types';
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

function getEdgeId(filePath: string, targetId: string, kind: IProjectedConnection['kind']): string {
  return `${filePath}->${targetId}#${kind}`;
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

function addGraphEdge(
  edgeMap: Map<string, IGraphEdge>,
  edges: IGraphEdge[],
  filePath: string,
  targetId: string,
  connection: IProjectedConnection,
  edgeSource: NonNullable<IGraphEdge['sources'][number]> | null | undefined,
): void {
  const edgeId = getEdgeId(filePath, targetId, connection.kind);
  const existing = edgeMap.get(edgeId);
  if (!existing) {
    const edge: IGraphEdge = {
      id: edgeId,
      from: filePath,
      to: targetId,
      kind: connection.kind,
      sources: edgeSource ? [edgeSource] : [],
    };

    edges.push(edge);
    edgeMap.set(edgeId, edge);
    return;
  }

  appendEdgeSource(existing, edgeSource);
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
      const sourcePluginId = connection.pluginId ?? plugin?.id;
      if (sourcePluginId && disabledPlugins.has(sourcePluginId)) {
        continue;
      }

      const targetId = getConnectionTargetId(plugin, connection, fileConnections, workspaceRoot);
      if (!targetId) {
        continue;
      }

      connectedIds.add(filePath);
      connectedIds.add(targetId);
      nodeIds.add(targetId);
      const edgeSource = createEdgeSource(plugin, connection);
      addGraphEdge(edgeMap, edges, filePath, targetId, connection, edgeSource);
    }
  }

  return {
    connectedIds,
    edges,
    nodeIds,
  };
}
