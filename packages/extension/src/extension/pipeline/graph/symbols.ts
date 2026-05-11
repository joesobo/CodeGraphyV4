import * as path from 'path';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
  IProjectedConnection,
} from '../../../core/plugins/types/contracts';
import type { IGraphEdge, IGraphNode } from '../../../shared/graph/contracts';
import { createGraphEdgeId } from '../../../shared/graph/edgeIdentity';
import { projectProjectedConnectionsFromFileAnalysis } from '../projection';

const SYMBOL_NODE_COLOR = '#8B5CF6';
const VARIABLE_NODE_COLOR = '#14B8A6';
const VARIABLE_SYMBOL_KINDS = new Set(['constant', 'field', 'property', 'variable']);

export function toRepoRelativeGraphPath(filePath: string, workspaceRoot: string): string {
  const relativePath = path.isAbsolute(filePath)
    ? path.relative(workspaceRoot, filePath)
    : filePath;

  return relativePath.replace(/\\/g, '/');
}

function normalizeSymbolKind(kind: string): string {
  return kind.trim().toLowerCase();
}

function createBaseCanonicalSymbolId(
  symbol: IAnalysisSymbol,
  workspaceRoot: string,
): string {
  const filePath = toRepoRelativeGraphPath(symbol.filePath, workspaceRoot);
  const kind = normalizeSymbolKind(symbol.kind);
  const signature = symbol.signature ? `:${encodeURIComponent(symbol.signature)}` : '';

  return `${filePath}#${symbol.name}:${kind}${signature}`;
}

function createSymbolNode(
  symbol: IAnalysisSymbol,
  id: string,
  workspaceRoot: string,
  containingFile: { churn?: number; fileSize?: number } = {},
): IGraphNode {
  const filePath = toRepoRelativeGraphPath(symbol.filePath, workspaceRoot);
  const kind = normalizeSymbolKind(symbol.kind);
  const nodeType = VARIABLE_SYMBOL_KINDS.has(kind) ? 'variable' : 'symbol';

  return {
    id,
    label: symbol.name,
    color: nodeType === 'variable' ? VARIABLE_NODE_COLOR : SYMBOL_NODE_COLOR,
    nodeType,
    fileSize: containingFile.fileSize,
    churn: containingFile.churn,
    symbol: {
      id,
      name: symbol.name,
      kind,
      filePath,
      ...(symbol.range ? { range: symbol.range } : {}),
      ...(symbol.signature ? { signature: symbol.signature } : {}),
    },
  };
}

function createContainsEdge(from: string, to: string): IGraphEdge {
  return {
    id: createGraphEdgeId({ from, to, kind: 'contains' }),
    from,
    to,
    kind: 'contains',
    sources: [],
  };
}

function hasSymbolEndpoint(relation: IAnalysisRelation): boolean {
  return Boolean(relation.fromSymbolId || relation.toSymbolId);
}

export function projectFileAnalysisConnections(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  workspaceRoot: string,
): Map<string, IProjectedConnection[]> {
  return new Map(
    Array.from(fileAnalysis.entries()).map(([filePath, analysis]) => [
      toRepoRelativeGraphPath(filePath, workspaceRoot),
      projectProjectedConnectionsFromFileAnalysis({
        ...analysis,
        relations: (analysis.relations ?? []).filter((relation) => !hasSymbolEndpoint(relation)),
      }),
    ]),
  );
}

function createCanonicalSymbolIds(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  workspaceRoot: string,
): Map<string, string> {
  const symbolIds = new Map<string, string>();
  const counts = new Map<string, number>();

  for (const analysis of fileAnalysis.values()) {
    for (const symbol of analysis.symbols ?? []) {
      const baseId = createBaseCanonicalSymbolId(symbol, workspaceRoot);
      const occurrence = (counts.get(baseId) ?? 0) + 1;
      counts.set(baseId, occurrence);
      const canonicalId = occurrence === 1 ? baseId : `${baseId}:${occurrence}`;
      symbolIds.set(symbol.id, canonicalId);
      symbolIds.set(canonicalId, canonicalId);
    }
  }

  return symbolIds;
}

function createRelationEdgeSource(relation: IAnalysisRelation): IGraphEdge['sources'][number] | undefined {
  if (!relation.pluginId) {
    return undefined;
  }

  return {
    id: `${relation.pluginId}:${relation.sourceId}`,
    pluginId: relation.pluginId,
    sourceId: relation.sourceId,
    label: relation.sourceId,
    metadata: relation.metadata,
    variant: relation.variant,
  };
}

function resolveRelationSourceId(
  relation: IAnalysisRelation,
  symbolIds: ReadonlyMap<string, string>,
  workspaceRoot: string,
): string {
  return relation.fromSymbolId
    ? symbolIds.get(relation.fromSymbolId) ?? relation.fromSymbolId
    : toRepoRelativeGraphPath(relation.fromFilePath, workspaceRoot);
}

function resolveRelationTargetId(
  relation: IAnalysisRelation,
  symbolIds: ReadonlyMap<string, string>,
  workspaceRoot: string,
): string | undefined {
  if (relation.toSymbolId) {
    return symbolIds.get(relation.toSymbolId) ?? relation.toSymbolId;
  }

  const targetPath = relation.toFilePath ?? relation.resolvedPath;
  return targetPath ? toRepoRelativeGraphPath(targetPath, workspaceRoot) : undefined;
}

function createSymbolRelationEdges(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  workspaceRoot: string,
): IGraphEdge[] {
  const symbolIds = createCanonicalSymbolIds(fileAnalysis, workspaceRoot);
  const edges: IGraphEdge[] = [];

  for (const analysis of fileAnalysis.values()) {
    for (const relation of analysis.relations ?? []) {
      if (!hasSymbolEndpoint(relation)) {
        continue;
      }

      const from = resolveRelationSourceId(relation, symbolIds, workspaceRoot);
      const to = resolveRelationTargetId(relation, symbolIds, workspaceRoot);
      if (!to) {
        continue;
      }

      const source = createRelationEdgeSource(relation);
      edges.push({
        id: createGraphEdgeId({ from, to, kind: relation.kind }),
        from,
        to,
        kind: relation.kind,
        sources: source ? [source] : [],
      });
    }
  }

  return edges;
}

export function buildSymbolNodesAndEdges(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  workspaceRoot: string,
  options: {
    cacheFiles?: Record<string, { size?: number }>;
    churnCounts?: Record<string, number>;
  } = {},
): { edges: IGraphEdge[]; nodes: IGraphNode[] } {
  const symbolIds = createCanonicalSymbolIds(fileAnalysis, workspaceRoot);
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
    }
  }

  return { edges: [...edges, ...createSymbolRelationEdges(fileAnalysis, workspaceRoot)], nodes };
}
