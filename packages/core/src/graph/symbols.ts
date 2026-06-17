import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import path from 'node:path';
import type { IProjectedConnection } from '../analysis/projectedConnection';
import { projectProjectedConnectionsFromFileAnalysis } from '../analysis/projection';
import type { IGraphEdge, IGraphNode } from './contracts';
import { createCanonicalSymbolIds } from './symbolIds';
import { createContainsEdge, createSymbolNode } from './symbolNodes';
import { createSymbolRelationEdges, hasSymbolEndpoint } from './symbolRelations';
import { toRepoRelativeGraphPath } from './symbolPaths';

export function projectFileAnalysisConnections(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  workspaceRoot: string,
  options: { includeSymbolEndpointRelations?: boolean } = {},
): Map<string, IProjectedConnection[]> {
  return new Map(
    Array.from(fileAnalysis.entries()).map(([filePath, analysis]) => [
      toRepoRelativeGraphPath(filePath, workspaceRoot),
      projectProjectedConnectionsFromFileAnalysis({
        ...analysis,
        relations: options.includeSymbolEndpointRelations === false
          ? analysis.relations?.filter((relation) => !hasSymbolEndpoint(relation))
          : analysis.relations,
      }),
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
  const projectableNamespaceSymbolIds = collectProjectableNamespaceSymbolIds(fileAnalysis);
  const explicitlyContainedSymbolIds = collectExplicitlyContainedSymbolIds(fileAnalysis);
  const containingFileIds = new Set<string>();
  const nodes: IGraphNode[] = [];
  const edges: IGraphEdge[] = [];

  for (const [filePath, analysis] of fileAnalysis) {
    const relativeFilePath = toRepoRelativeGraphPath(filePath, workspaceRoot);

    for (const symbol of analysis.symbols ?? []) {
      if (symbol.kind === 'namespace' && !projectableNamespaceSymbolIds.has(symbol.id)) {
        continue;
      }

      const node = createSymbolNode(symbol, symbolIds.get(symbol.id) ?? symbol.id, workspaceRoot, {
        fileSize: options.cacheFiles?.[relativeFilePath]?.size,
        churn: options.churnCounts?.[relativeFilePath] ?? 0,
      });
      nodes.push(node);
      if (!explicitlyContainedSymbolIds.has(symbol.id) && !explicitlyContainedSymbolIds.has(node.id)) {
        edges.push(createContainsEdge(relativeFilePath, node.id));
      }
      containingFileIds.add(relativeFilePath);
    }
  }

  return {
    containingFileIds,
    edges: [...edges, ...createSymbolRelationEdges(fileAnalysis, workspaceRoot)],
    nodes,
  };
}

function collectExplicitlyContainedSymbolIds(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
): Set<string> {
  const symbolIds = new Set<string>();
  for (const analysis of fileAnalysis.values()) {
    for (const relation of analysis.relations ?? []) {
      if (relation.kind === 'contains' && relation.toSymbolId) {
        symbolIds.add(relation.toSymbolId);
      }
    }
  }
  return symbolIds;
}

function collectProjectableNamespaceSymbolIds(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
): Set<string> {
  const namespaceSymbolsByName = new Map<string, NonNullable<IFileAnalysisResult['symbols']>>();

  for (const analysis of fileAnalysis.values()) {
    const symbols = analysis.symbols;
    if (!symbols) {
      continue;
    }

    for (const symbol of symbols) {
      if (symbol.kind !== 'namespace') {
        continue;
      }

      namespaceSymbolsByName.set(symbol.name, [
        ...(namespaceSymbolsByName.get(symbol.name) ?? []),
        symbol,
      ]);
    }
  }

  return new Set(
    Array.from(namespaceSymbolsByName.values()).flatMap((symbols) => {
      if (symbols.length === 1) {
        return [symbols[0].id];
      }

      return [selectCanonicalNamespaceSymbol(symbols, fileAnalysis).id];
    }),
  );
}

function selectCanonicalNamespaceSymbol(
  symbols: NonNullable<IFileAnalysisResult['symbols']>,
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
) {
  return [...symbols].sort((left, right) => (
    scoreNamespaceSymbol(right, fileAnalysis) - scoreNamespaceSymbol(left, fileAnalysis)
    || left.filePath.length - right.filePath.length
    || left.filePath.localeCompare(right.filePath)
  ))[0];
}

function scoreNamespaceSymbol(
  symbol: NonNullable<IFileAnalysisResult['symbols']>[number],
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
): number {
  const headerBonus = isHeaderPath(symbol.filePath) ? 10_000 : 0;
  return headerBonus + countIncomingIncludes(symbol.filePath, fileAnalysis);
}

function countIncomingIncludes(
  filePath: string,
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
): number {
  let count = 0;

  for (const analysis of fileAnalysis.values()) {
    const relations = analysis.relations;
    if (!relations) {
      continue;
    }

    for (const relation of relations) {
      if (relation.kind === 'include' && (relation.toFilePath ?? relation.resolvedPath) === filePath) {
        count += 1;
      }
    }
  }

  return count;
}

function isHeaderPath(filePath: string): boolean {
  return ['.h', '.hh', '.hpp', '.hxx'].includes(path.extname(filePath));
}
