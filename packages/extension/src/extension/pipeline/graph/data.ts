/**
 * @fileoverview Graph building helpers for workspace analysis.
 * @module extension/workspaceGraphData
 */

import type {
  IFileAnalysisResult,
  IProjectedConnection,
  IPlugin,
} from '../../../core/plugins/types/contracts';
import { DEFAULT_NODE_COLOR } from '../../../shared/fileColors';
import type { IGraphData } from '../../../shared/graph/contracts';
import { buildWorkspaceGraphEdges } from './edges';
import { buildWorkspaceGraphNodes } from './nodes';
import {
  buildSymbolNodesAndEdges,
  projectFileAnalysisConnections,
  toRepoRelativeGraphPath,
} from './symbols';

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
  const existingNodeIds = new Set(graphData.nodes.map(node => node.id));
  const connectedAnalysisFileIds = new Set(symbolGraph.containingFileIds);
  for (const [filePath, analysis] of options.fileAnalysis) {
    if ((analysis.relations?.length ?? 0) > 0 || (analysis.symbols?.length ?? 0) > 0) {
      connectedAnalysisFileIds.add(toRepoRelativeGraphPath(filePath, options.workspaceRoot));
    }
  }
  const containingFileNodes = Array.from(connectedAnalysisFileIds)
    .filter(filePath => !existingNodeIds.has(filePath))
    .map(filePath => ({
      id: filePath,
      label: filePath.split('/').pop() ?? filePath,
      color: DEFAULT_NODE_COLOR,
      fileSize: options.cacheFiles[filePath]?.size,
      churn: options.churnCounts[filePath] ?? 0,
    }));

  return {
    nodes: [...graphData.nodes, ...containingFileNodes, ...symbolGraph.nodes],
    edges: [...graphData.edges, ...symbolGraph.edges],
  };
}
