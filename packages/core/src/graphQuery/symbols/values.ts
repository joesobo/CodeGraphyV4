import type { GraphQuerySymbolReportItem } from '../model';

const SYMBOL_VALUE_READERS: Record<string, (symbol: GraphQuerySymbolReportItem) => string | undefined> = {
  filePath: (symbol) => symbol.filePath,
  kind: (symbol) => symbol.kind,
  id: (symbol) => symbol.id,
  name: (symbol) => symbol.name,
  signature: (symbol) => symbol.signature,
  language: (symbol) => symbol.language,
  source: (symbol) => symbol.source,
  pluginKind: (symbol) => symbol.pluginKind,
};

export function readSymbolValue(symbol: GraphQuerySymbolReportItem, field: string): string {
  return SYMBOL_VALUE_READERS[field]?.(symbol) ?? '';
}

export function applySymbolSearch(
  symbols: readonly GraphQuerySymbolReportItem[],
  search: string | undefined,
): GraphQuerySymbolReportItem[] {
  if (!search?.trim()) {
    return [...symbols];
  }

  const query = search.toLowerCase();
  return symbols.filter((symbol) =>
    [
      symbol.id,
      symbol.filePath,
      symbol.name,
      symbol.kind,
      symbol.signature,
      symbol.language,
      symbol.source,
      symbol.pluginKind,
    ].join(' ').toLowerCase().includes(query)
  );
}
