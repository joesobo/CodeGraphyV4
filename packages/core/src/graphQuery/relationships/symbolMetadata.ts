import type { IAnalysisSymbol } from '@codegraphy/plugin-api';
import type { GraphQueryRelationshipSymbol } from '../model';

function readSymbolMetadata(symbol: IAnalysisSymbol, field: string): string | undefined {
  const value = symbol.metadata?.[field];
  return typeof value === 'string' ? value : undefined;
}

export function createSymbolMetadata(symbol: IAnalysisSymbol): Partial<GraphQueryRelationshipSymbol> {
  return {
    ...(symbol.signature ? { signature: symbol.signature } : {}),
    ...(symbol.range ? { range: symbol.range } : {}),
    ...(readSymbolMetadata(symbol, 'language') ? { language: readSymbolMetadata(symbol, 'language') } : {}),
    ...(readSymbolMetadata(symbol, 'source') ? { source: readSymbolMetadata(symbol, 'source') } : {}),
    ...(readSymbolMetadata(symbol, 'pluginKind') ? { pluginKind: readSymbolMetadata(symbol, 'pluginKind') } : {}),
  };
}
