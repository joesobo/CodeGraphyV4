import type { GraphEdgeKind } from '../../graph/contracts';
import type { IAnalysisRelationshipEvidence, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { GraphQueryRelationshipSymbol } from '../model';
import { createSymbolMetadata } from './symbolMetadata';
import {
  getRelationshipEvidenceSourceSymbolId,
  getRelationshipEvidenceTargetSymbolId,
} from '../../analysis/relationshipEvidence';

export function createSymbolMap(symbols: readonly IAnalysisSymbol[] | undefined): Map<string, IAnalysisSymbol> {
  return new Map((symbols ?? []).map((symbol) => [symbol.id, symbol]));
}

function shouldIncludeSymbolKind(edgeType: GraphEdgeKind, symbol: IAnalysisSymbol): boolean {
  return edgeType !== 'type-import' && symbol.kind.length > 0;
}

export function createRelationshipSymbol(
  edgeType: GraphEdgeKind,
  relation: IAnalysisRelationshipEvidence,
  symbolById: ReadonlyMap<string, IAnalysisSymbol>,
): GraphQueryRelationshipSymbol | undefined {
  const symbolId = getRelationshipEvidenceTargetSymbolId(relation) ?? getRelationshipEvidenceSourceSymbolId(relation);
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
export { createProvenance } from './provenance';
