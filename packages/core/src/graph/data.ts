/**
 * @fileoverview Graph building helpers for workspace analysis.
 * @module core/workspaceGraphData
 */

import type {
  IFileAnalysisResult,
  IPlugin,
} from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../analysis/projectedConnection';
import { enrichWorkspaceFileAnalysis } from '../analysis/fileAnalysis/enrichment';
import { requiresSymbolAnalysisCacheTier } from '../analysis/fileAnalysis/cacheTiers';
import { DEFAULT_NODE_COLOR } from '../fileColors';
import { CORE_GRAPH_NODE_TYPES } from '../graphControls/defaults/definitions';
import { filterDisabledPluginFileAnalysis } from '../plugins/activityState/analysisFacts';
import { buildAnalysisNodesAndEdges } from './analysisNodes';
import type { IGraphData } from './contracts';
import { buildWorkspaceGraphEdges } from './edges';
import { buildWorkspaceGraphNodes } from './nodes';
import {
  buildSymbolNodesAndEdges,
  projectFileAnalysisConnections,
} from './symbols';
import { toRepoRelativeGraphPath } from './symbolPaths';

export interface IWorkspaceGraphDataOptions {
  cacheFiles: Record<string, { size?: number }>;
  directoryPaths?: readonly string[];
  disabledPlugins: ReadonlySet<string>;
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>;
  gitIgnoredPaths?: readonly string[];
  showOrphans: boolean;
  churnCounts: Record<string, number>;
  workspaceRoot: string;
  getPluginForFile: (absolutePath: string) => IPlugin | undefined;
}

export interface IWorkspaceGraphAnalysisDataOptions extends Omit<IWorkspaceGraphDataOptions, 'fileConnections'> {
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>;
  nodeVisibility?: Readonly<Record<string, boolean>>;
}

function createContainingFileNode(
  filePath: string,
  options: Pick<IWorkspaceGraphAnalysisDataOptions, 'cacheFiles' | 'churnCounts'>,
): IGraphData['nodes'][number] {
  return {
    id: filePath,
    label: filePath.split('/').pop() ?? filePath,
    color: DEFAULT_NODE_COLOR,
    fileSize: options.cacheFiles[filePath]?.size,
    churn: options.churnCounts[filePath] ?? 0,
  };
}

function collectConnectedAnalysisFileIds(
  fileAnalysis: IWorkspaceGraphAnalysisDataOptions['fileAnalysis'],
  workspaceRoot: string,
  containingFileIds: Iterable<string>,
  options: { includeSymbols: boolean },
): Set<string> {
  const connectedAnalysisFileIds = new Set(containingFileIds);
  for (const [filePath, analysis] of fileAnalysis) {
    const hasRelations = (analysis.relations?.length ?? 0) > 0;
    const hasSymbols = options.includeSymbols && (analysis.symbols?.length ?? 0) > 0;
    if (hasRelations || hasSymbols) {
      connectedAnalysisFileIds.add(toRepoRelativeGraphPath(filePath, workspaceRoot));
    }
  }
  return connectedAnalysisFileIds;
}

function shouldProjectSymbolGraph(
  nodeVisibility: IWorkspaceGraphAnalysisDataOptions['nodeVisibility'],
): boolean {
  return requiresSymbolAnalysisCacheTier(nodeVisibility ?? {});
}

const CORE_SYMBOL_LEAF_NODE_TYPE_IDS = new Set(
  CORE_GRAPH_NODE_TYPES
    .filter((definition) =>
      definition.parentId === 'symbol'
      || definition.parentId === 'variable')
    .map((definition) => definition.id),
);

function hasVisibleCoreSymbolLeaf(
  nodeVisibility: IWorkspaceGraphAnalysisDataOptions['nodeVisibility'],
): boolean {
  return Object.entries(nodeVisibility ?? {}).some(([nodeType, visible]) =>
    visible === true && CORE_SYMBOL_LEAF_NODE_TYPE_IDS.has(nodeType),
  );
}

function shouldIncludeSymbolEndpointRelations(
  nodeVisibility: IWorkspaceGraphAnalysisDataOptions['nodeVisibility'],
): boolean {
  return !shouldProjectSymbolGraph(nodeVisibility) || !hasVisibleCoreSymbolLeaf(nodeVisibility);
}

export function buildWorkspaceGraphData(options: IWorkspaceGraphDataOptions): IGraphData {
  const {
    cacheFiles,
    churnCounts,
    directoryPaths = [],
    disabledPlugins,
    fileConnections,
    gitIgnoredPaths = [],
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
    gitIgnoredPaths,
    nodeIds,
    showOrphans,
    churnCounts,
  });

  return { nodes, edges };
}

export function buildWorkspaceGraphDataFromAnalysis(
  options: IWorkspaceGraphAnalysisDataOptions,
): IGraphData {
  const activeFileAnalysis = filterDisabledPluginFileAnalysis(options.fileAnalysis, options.disabledPlugins);
  const fileAnalysis = enrichWorkspaceFileAnalysis(activeFileAnalysis);
  const projectSymbolGraph = shouldProjectSymbolGraph(options.nodeVisibility);
  const graphData = buildWorkspaceGraphData({
    ...options,
    fileConnections: projectFileAnalysisConnections(fileAnalysis, options.workspaceRoot, {
      includeSymbolEndpointRelations: shouldIncludeSymbolEndpointRelations(options.nodeVisibility),
    }),
  });
  const symbolGraph = projectSymbolGraph
    ? buildSymbolNodesAndEdges(fileAnalysis, options.workspaceRoot, {
        cacheFiles: options.cacheFiles,
        churnCounts: options.churnCounts,
        gitIgnoredPaths: options.gitIgnoredPaths,
      })
    : { containingFileIds: new Set<string>(), edges: [], nodes: [] };
  const analysisNodeGraph = buildAnalysisNodesAndEdges(fileAnalysis, options.workspaceRoot);
  const existingNodeIds = new Set(graphData.nodes.map(node => node.id));
  const connectedAnalysisFileIds = collectConnectedAnalysisFileIds(
    fileAnalysis,
    options.workspaceRoot,
    symbolGraph.containingFileIds,
    { includeSymbols: projectSymbolGraph },
  );
  for (const fileId of analysisNodeGraph.containingFileIds) {
    connectedAnalysisFileIds.add(fileId);
  }
  const containingFileNodes = Array.from(connectedAnalysisFileIds)
    .filter(filePath => !existingNodeIds.has(filePath))
    .map(filePath => createContainingFileNode(filePath, options));

  return {
    nodes: [
      ...graphData.nodes,
      ...containingFileNodes,
      ...analysisNodeGraph.nodes.filter(node => !existingNodeIds.has(node.id)),
      ...symbolGraph.nodes,
    ],
    edges: [...graphData.edges, ...analysisNodeGraph.edges, ...symbolGraph.edges],
  };
}
