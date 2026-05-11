import type { GraphEdgeKind } from '../../../shared/graph/contracts';
import type { IAnalysisRelation, IAnalysisSymbol } from '../../plugins/types/contracts';
import type {
  GraphQueryRelationshipProvenance,
  GraphQueryRelationshipSymbol,
} from '../model';

const TREE_SITTER_PLUGIN_ID = 'codegraphy.treesitter';

export function createSymbolMap(symbols: readonly IAnalysisSymbol[] | undefined): Map<string, IAnalysisSymbol> {
  return new Map((symbols ?? []).map((symbol) => [symbol.id, symbol]));
}

function shouldIncludeSymbolKind(edgeType: GraphEdgeKind, symbol: IAnalysisSymbol): boolean {
  return edgeType !== 'type-import' && symbol.kind.length > 0;
}

function readSymbolMetadata(symbol: IAnalysisSymbol, field: string): string | undefined {
  const value = symbol.metadata?.[field];
  return typeof value === 'string' ? value : undefined;
}

function createSymbolMetadata(symbol: IAnalysisSymbol): Partial<GraphQueryRelationshipSymbol> {
  return {
    ...(symbol.signature ? { signature: symbol.signature } : {}),
    ...(symbol.range ? { range: symbol.range } : {}),
    ...(readSymbolMetadata(symbol, 'language') ? { language: readSymbolMetadata(symbol, 'language') } : {}),
    ...(readSymbolMetadata(symbol, 'source') ? { source: readSymbolMetadata(symbol, 'source') } : {}),
    ...(readSymbolMetadata(symbol, 'pluginKind') ? { pluginKind: readSymbolMetadata(symbol, 'pluginKind') } : {}),
  };
}

export function createRelationshipSymbol(
  edgeType: GraphEdgeKind,
  relation: IAnalysisRelation,
  symbolById: ReadonlyMap<string, IAnalysisSymbol>,
): GraphQueryRelationshipSymbol | undefined {
  const symbolId = relation.toSymbolId ?? relation.fromSymbolId;
  if (!symbolId) {
    return undefined;
  }

  const symbol = symbolById.get(symbolId);
  if (!symbol) {
    return undefined;
  }

  return {
    id: symbol.id,
    filePath: symbol.filePath,
    name: symbol.name,
    ...(shouldIncludeSymbolKind(edgeType, symbol) ? { kind: symbol.kind } : {}),
    ...createSymbolMetadata(symbol),
  };
}

export function createProvenance(relation: IAnalysisRelation): GraphQueryRelationshipProvenance | undefined {
  if (!relation.pluginId || relation.pluginId === TREE_SITTER_PLUGIN_ID) {
    return undefined;
  }

  return {
    pluginId: relation.pluginId,
    sourceId: relation.sourceId,
  };
}
