import type { IFileAnalysisResult, IProjectedConnection } from '../../../core/plugins/types/contracts';
import type { IGraphEdge, IGraphNode } from '../../../shared/graph/contracts';
import { projectProjectedConnectionsFromFileAnalysis } from '../projection';
import { createCanonicalSymbolIds } from './symbolIds';
import { createContainsEdge, createSymbolNode } from './symbolNodes';
import { createSymbolRelationEdges } from './symbolRelations';
import { toRepoRelativeGraphPath } from './symbolPaths';

export function projectFileAnalysisConnections(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  workspaceRoot: string,
): Map<string, IProjectedConnection[]> {
  return new Map(
    Array.from(fileAnalysis.entries()).map(([filePath, analysis]) => [
      toRepoRelativeGraphPath(filePath, workspaceRoot),
      projectProjectedConnectionsFromFileAnalysis(analysis),
    ]),
  );
}

export function buildSymbolNodesAndEdges(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  workspaceRoot: string,
  options: {
    cacheFiles?: Record<string, { size?: number }>;
    churnCounts?: Record<string, number>;
  } = {},
): { containingFileIds: Set<string>; edges: IGraphEdge[]; nodes: IGraphNode[] } {
  const symbolIds = createCanonicalSymbolIds(fileAnalysis, workspaceRoot);
  const containingFileIds = new Set<string>();
  const nodes: IGraphNode[] = [];
  const edges: IGraphEdge[] = [];

  for (const [filePath, analysis] of fileAnalysis) {
    const relativeFilePath = toRepoRelativeGraphPath(filePath, workspaceRoot);

    for (const symbol of analysis.symbols ?? []) {
      const node = createSymbolNode(symbol, symbolIds.get(symbol.id) ?? symbol.id, workspaceRoot, {
        fileSize: options.cacheFiles?.[relativeFilePath]?.size,
        churn: options.churnCounts?.[relativeFilePath] ?? 0,
      });
      nodes.push(node);
      edges.push(createContainsEdge(relativeFilePath, node.id));
      containingFileIds.add(relativeFilePath);
    }
  }

  return {
    containingFileIds,
    edges: [...edges, ...createSymbolRelationEdges(fileAnalysis, workspaceRoot)],
    nodes,
  };
}
