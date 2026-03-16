/**
 * @fileoverview Graph building helpers for workspace analysis.
 * @module extension/workspaceGraphData
 */

import type { IConnection, IPlugin } from '../core/plugins';
import type { IGraphData } from '../shared/types';
import { buildWorkspaceGraphEdges } from './workspaceGraphEdges';
import { buildWorkspaceGraphNodes } from './workspaceGraphNodes';

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

  const { connectedIds, edges, nodeIds } = buildWorkspaceGraphEdges({
    disabledPlugins,
    disabledRules,
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
