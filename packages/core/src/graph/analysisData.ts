import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { enrichWorkspaceFileAnalysis } from '../analysis/fileAnalysis/enrichment';
import { filterDisabledPluginFileAnalysis } from '../plugins/activityState/analysisFacts';
import { collectConnectedAnalysisFileIds, createContainingFileNode } from './containingFiles';
import type { IGraphData } from './contracts';
import { buildWorkspaceGraphData, type IWorkspaceGraphDataOptions } from './workspaceData';
import { buildSymbolNodesAndEdges } from './symbols';
import { projectFileAnalysisConnections } from './symbolProjection';
import { shouldIncludeSymbolEndpointRelations, shouldProjectSymbolGraph } from './symbolVisibility';

export interface IWorkspaceGraphAnalysisDataOptions extends Omit<IWorkspaceGraphDataOptions, 'fileConnections'> {
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>;
  nodeVisibility?: Readonly<Record<string, boolean>>;
}

export function buildWorkspaceGraphDataFromAnalysis(
  options: IWorkspaceGraphAnalysisDataOptions,
): IGraphData {
  const activeAnalysis = filterDisabledPluginFileAnalysis(options.fileAnalysis, options.disabledPlugins);
  const fileAnalysis = enrichWorkspaceFileAnalysis(activeAnalysis);
  const projectSymbols = shouldProjectSymbolGraph(options.nodeVisibility);
  const graphData = buildWorkspaceGraphData({
    ...options,
    fileConnections: projectFileAnalysisConnections(fileAnalysis, options.workspaceRoot, {
      includeSymbolEndpointRelations: shouldIncludeSymbolEndpointRelations(options.nodeVisibility),
    }),
  });
  const symbolGraph = projectSymbols
    ? buildSymbolNodesAndEdges(fileAnalysis, options.workspaceRoot, {
        cacheFiles: options.cacheFiles,
        gitIgnoredPaths: options.gitIgnoredPaths,
      })
    : { containingFileIds: new Set<string>(), edges: [], nodes: [] };
  const existingNodeIds = new Set(graphData.nodes.map(node => node.id));
  const containingFileNodes = Array.from(collectConnectedAnalysisFileIds(
    fileAnalysis,
    options.workspaceRoot,
    symbolGraph.containingFileIds,
    projectSymbols,
  )).filter(filePath => !existingNodeIds.has(filePath))
    .map(filePath => createContainingFileNode(filePath, options.cacheFiles));

  return {
    nodes: [...graphData.nodes, ...containingFileNodes, ...symbolGraph.nodes],
    edges: [...graphData.edges, ...symbolGraph.edges],
  };
}
