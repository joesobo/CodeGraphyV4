import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { GraphQuerySymbolReportItem } from '../model';

export function readSymbolMetadata(symbol: IAnalysisSymbol, field: string): string | undefined {
  const value = symbol.metadata?.[field];
  return typeof value === 'string' ? value : undefined;
}

export function toSymbolReportBase(symbol: IAnalysisSymbol): GraphQuerySymbolReportItem {
  return {
    id: symbol.id,
    name: symbol.name,
    ...(symbol.kind ? { kind: symbol.kind } : {}),
    ...(symbol.signature ? { signature: symbol.signature } : {}),
    ...(symbol.range ? { range: symbol.range } : {}),
    ...(readSymbolMetadata(symbol, 'language') ? { language: readSymbolMetadata(symbol, 'language') } : {}),
    ...(readSymbolMetadata(symbol, 'source') ? { source: readSymbolMetadata(symbol, 'source') } : {}),
    ...(readSymbolMetadata(symbol, 'pluginKind') ? { pluginKind: readSymbolMetadata(symbol, 'pluginKind') } : {}),
  };
}
