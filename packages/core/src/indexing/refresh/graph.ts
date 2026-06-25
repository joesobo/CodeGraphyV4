import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../../analysis/projectedConnection';
import type { IGraphData } from '../../graph/contracts';
import { toRepoRelativeGraphPath } from '../../graph/symbolPaths';
import type { WorkspaceIndexRefreshSource } from './contracts';

export function buildWorkspaceIndexGraphFromRefreshState(
  source: WorkspaceIndexRefreshSource,
  workspaceRoot: string,
  disabledPlugins: Set<string>,
): IGraphData {
  const analysisGraphData = source._buildGraphDataFromAnalysis(
    source._lastFileAnalysis,
    workspaceRoot,
    disabledPlugins,
  );
  if (workspaceIndexAnalysisCoversConnections(
    source._lastFileAnalysis,
    source._lastFileConnections,
    workspaceRoot,
  )) {
    source._lastGraphData = analysisGraphData;
    return analysisGraphData;
  }

  const graphData = mergeWorkspaceIndexGraphData(
    analysisGraphData,
    source._buildGraphData(source._lastFileConnections, workspaceRoot, disabledPlugins),
  );
  source._lastGraphData = graphData;
  return graphData;
}

function mergeWorkspaceIndexGraphData(
  primaryGraphData: IGraphData,
  fallbackGraphData: IGraphData,
): IGraphData {
  const nodeIds = new Set(primaryGraphData.nodes.map(node => node.id));
  const edgeIds = new Set(primaryGraphData.edges.map(edge =>
    edge.id ?? `${edge.from}\0${edge.to}\0${edge.kind}`,
  ));

  return {
    nodes: [
      ...primaryGraphData.nodes,
      ...fallbackGraphData.nodes.filter(node => !nodeIds.has(node.id)),
    ],
    edges: [
      ...primaryGraphData.edges,
      ...fallbackGraphData.edges.filter(edge =>
        !edgeIds.has(edge.id ?? `${edge.from}\0${edge.to}\0${edge.kind}`),
      ),
    ],
  };
}

function workspaceIndexAnalysisCoversConnections(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>,
  workspaceRoot: string,
): boolean {
  const analysisFilePaths = new Set(
    [...fileAnalysis.keys()].map(filePath =>
      toRepoRelativeGraphPath(filePath, workspaceRoot),
    ),
  );

  for (const filePath of fileConnections.keys()) {
    if (!analysisFilePaths.has(toRepoRelativeGraphPath(filePath, workspaceRoot))) {
      return false;
    }
  }

  return true;
}
