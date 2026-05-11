/**
 * @fileoverview Graph building helpers for workspace analysis.
 * @module extension/workspaceGraphData
 */

import type {
  IFileAnalysisResult,
  IProjectedConnection,
  IPlugin,
} from '../../../core/plugins/types/contracts';
import type { IGraphData } from '../../../shared/graph/contracts';
import { buildWorkspaceGraphEdges } from './edges';
import { buildWorkspaceGraphNodes } from './nodes';
import { buildSymbolNodesAndEdges, projectFileAnalysisConnections } from './symbols';

export interface IWorkspaceGraphDataOptions {
  cacheFiles: Record<string, { size?: number }>;
  directoryPaths?: readonly string[];
  disabledPlugins: ReadonlySet<string>;
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>;
  showOrphans: boolean;
  churnCounts: Record<string, number>;
  workspaceRoot: string;
  getPluginForFile: (absolutePath: string) => IPlugin | undefined;
}

export interface IWorkspaceGraphAnalysisDataOptions extends Omit<IWorkspaceGraphDataOptions, 'fileConnections'> {
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>;
}

export function buildWorkspaceGraphData(options: IWorkspaceGraphDataOptions): IGraphData {
  const {
    cacheFiles,
    churnCounts,
    directoryPaths = [],
    disabledPlugins,
    fileConnections,
    showOrphans,
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
    directoryPaths,
    nodeIds,
    showOrphans,
    churnCounts,
  });

  return { nodes, edges };
}

export function buildWorkspaceGraphDataFromAnalysis(
  options: IWorkspaceGraphAnalysisDataOptions,
): IGraphData {
  const graphData = buildWorkspaceGraphData({
    ...options,
    fileConnections: projectFileAnalysisConnections(options.fileAnalysis, options.workspaceRoot),
  });
  const symbolGraph = buildSymbolNodesAndEdges(options.fileAnalysis, options.workspaceRoot, {
    cacheFiles: options.cacheFiles,
    churnCounts: options.churnCounts,
  });

  return {
    nodes: [...graphData.nodes, ...symbolGraph.nodes],
    edges: [...graphData.edges, ...symbolGraph.edges],
  };
}
