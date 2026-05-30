import type { IGraphData } from '../graph/contracts';
import type { GraphModelScopeConfig } from './contracts';
import { filterEdgesToNodes, isFileNode } from './model';
import { buildProjectedStructuralEdges } from './structuralProjection/edges';
import { collectVisibleFolderNodeIds, isFolderNode, projectFolders } from './structuralProjection/folders';
import {
  hasStructuralNodeProjection,
  resolveStructuralProjectionOptions,
} from './structuralProjection/options';
import { projectWorkspacePackages } from './structuralProjection/packages';

export function applyStructuralProjection(
  graphData: IGraphData,
  scope?: GraphModelScopeConfig,
  sourceGraphData: IGraphData = graphData,
): IGraphData {
  const options = resolveStructuralProjectionOptions(scope);

  if (!hasStructuralNodeProjection(options)) {
    return graphData;
  }

  const sourceFileNodes = sourceGraphData.nodes.filter(isFileNode);
  const sourceFolderNodes = sourceGraphData.nodes.filter(isFolderNode);
  const visibleFileNodes = graphData.nodes.filter(isFileNode);
  const folderProjection = projectFolders(
    options.folderEnabled,
    sourceFileNodes,
    sourceFolderNodes,
    collectVisibleFolderNodeIds(graphData.nodes),
  );
  const packageProjection = projectWorkspacePackages(options.packageEnabled, sourceFileNodes);
  const nodes = [...graphData.nodes, ...folderProjection.nodes, ...packageProjection.nodes];
  const structuralEdges = buildProjectedStructuralEdges(
    options,
    folderProjection.paths,
    packageProjection.roots,
    visibleFileNodes,
  );

  return {
    nodes,
    edges: filterEdgesToNodes([...graphData.edges, ...structuralEdges], nodes),
  };
}
