/**
 * @fileoverview Graph building helpers for workspace analysis.
 * @module extension/workspaceGraphData
 */

import type { IConnection, IPlugin } from '../../../core/plugins/types/contracts';
import type { IGraphData } from '../../../shared/graph/types';
import { buildWorkspaceGraphEdges } from './edges';
import { buildWorkspaceGraphNodes } from './nodes';

export interface IWorkspaceGraphDataOptions {
  cacheFiles: Record<string, { size?: number }>;
  disabledPlugins: ReadonlySet<string>;
  disabledSources: ReadonlySet<string>;
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
    disabledSources,
    fileConnections,
    showOrphans,
    visitCounts,
    workspaceRoot,
    getPluginForFile,
  } = options;

  const { connectedIds, edges, nodeIds } = buildWorkspaceGraphEdges({
    disabledPlugins,
    disabledSources,
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
