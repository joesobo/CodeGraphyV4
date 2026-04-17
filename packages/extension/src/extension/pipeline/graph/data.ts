/**
 * @fileoverview Graph building helpers for workspace analysis.
 * @module extension/workspaceGraphData
 */

import type { IProjectedConnection, IPlugin } from '../../../core/plugins/types/contracts';
import type { IGraphData } from '../../../shared/graph/contracts';
import { buildWorkspaceGraphEdges } from './edges';
import { buildWorkspaceGraphNodes } from './nodes';

export interface IWorkspaceGraphDataOptions {
  cacheFiles: Record<string, { size?: number }>;
  disabledPlugins: ReadonlySet<string>;
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>;
  showOrphans: boolean;
  visitCounts: Record<string, number>;
  workspaceRoot: string;
  getPluginForFile: (absolutePath: string) => IPlugin | undefined;
}

export function buildWorkspaceGraphData(options: IWorkspaceGraphDataOptions): IGraphData {
  const {
    cacheFiles,
    disabledPlugins,
    fileConnections,
    showOrphans,
    visitCounts,
    workspaceRoot,
    getPluginForFile,
  } = options;

  const { connectedIds, edges, nodeIds } = buildWorkspaceGraphEdges({
    disabledPlugins,
    fileConnections,
    getPluginForFile,
    workspaceRoot,
  });
  const nodes = buildWorkspaceGraphNodes({
    cacheFiles,
    connectedIds,
    nodeIds,
    showOrphans,
    visitCounts,
  });

  return { nodes, edges };
}
