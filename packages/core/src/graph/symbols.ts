import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IGraphEdge, IGraphNode } from './contracts';
import { collectProjectableNamespaceSymbolIds } from './namespaceSymbols';
import { createCanonicalSymbolIds } from './symbolIds';
import { collectExplicitlyContainedSymbolIds } from './symbolContainment';
import { createContainsEdge, createSymbolNode } from './symbolNodes';
import { createSymbolRelationEdges } from './symbolRelations';
import { toRepoRelativeGraphPath } from './symbolPaths';
export { projectFileAnalysisConnections } from './symbolProjection';

function addFileSymbolNodes(input: {
  analysis: IFileAnalysisResult;
  containingFile: { fileSize?: number; gitIgnored: boolean };
  explicitlyContainedSymbolIds: ReadonlySet<string>;
  projectableNamespaceSymbolIds: ReadonlySet<string>;
  relativeFilePath: string;
  symbolIds: ReadonlyMap<string, string>;
  workspaceRoot: string;
}, nodes: IGraphNode[], edges: IGraphEdge[]): boolean {
  let containsSymbols = false;
  for (const symbol of input.analysis.symbols ?? []) {
    if (symbol.kind === 'namespace' && !input.projectableNamespaceSymbolIds.has(symbol.id)) continue;

    const node = createSymbolNode(
      symbol,
      input.symbolIds.get(symbol.id) ?? symbol.id,
      input.workspaceRoot,
      input.containingFile,
    );
    nodes.push(node);
    if (!input.explicitlyContainedSymbolIds.has(symbol.id)
      && !input.explicitlyContainedSymbolIds.has(node.id)) {
      edges.push(createContainsEdge(input.relativeFilePath, node.id));
    }
    containsSymbols = true;
  }
  return containsSymbols;
}

export function buildSymbolNodesAndEdges(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  workspaceRoot: string,
  options: {
    cacheFiles?: Record<string, { size?: number }>;
    gitIgnoredPaths?: readonly string[];
  } = {},
): { containingFileIds: Set<string>; edges: IGraphEdge[]; nodes: IGraphNode[] } {
  const symbolIds = createCanonicalSymbolIds(fileAnalysis, workspaceRoot);
  const projectableNamespaceSymbolIds = collectProjectableNamespaceSymbolIds(fileAnalysis);
  const explicitlyContainedSymbolIds = collectExplicitlyContainedSymbolIds(fileAnalysis);
  const gitIgnoredPathSet = new Set(options.gitIgnoredPaths ?? []);
  const containingFileIds = new Set<string>();
  const nodes: IGraphNode[] = [];
  const edges: IGraphEdge[] = [];

  for (const [filePath, analysis] of fileAnalysis) {
    const relativeFilePath = toRepoRelativeGraphPath(filePath, workspaceRoot);
    const containingFile = createContainingFileMetadata(relativeFilePath, {
      cacheFiles: options.cacheFiles,
      gitIgnoredPathSet,
    });

    if (addFileSymbolNodes({
      analysis,
      containingFile,
      explicitlyContainedSymbolIds,
      projectableNamespaceSymbolIds,
      relativeFilePath,
      symbolIds,
      workspaceRoot,
    }, nodes, edges)) {
      containingFileIds.add(relativeFilePath);
    }
  }

  return {
    containingFileIds,
    edges: [...edges, ...createSymbolRelationEdges(fileAnalysis, workspaceRoot)],
    nodes,
  };
}

function createContainingFileMetadata(
  relativeFilePath: string,
  options: {
    cacheFiles: Record<string, { size?: number }> | undefined;
    gitIgnoredPathSet: ReadonlySet<string>;
  },
): { fileSize?: number; gitIgnored: boolean } {
  return {
    fileSize: options.cacheFiles?.[relativeFilePath]?.size,
    gitIgnored: options.gitIgnoredPathSet.has(relativeFilePath),
  };
}
