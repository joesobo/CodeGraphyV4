import type { IAnalysisRelation, IAnalysisSymbol } from '../plugins/types/contracts';
import { applyReportFilters } from './filter';
import type { GraphQueryData } from './data';
import type {
  GraphQuerySymbolReport,
  GraphQuerySymbolReportItem,
  GraphQuerySymbolsConfig,
} from './model';
import { paginate } from './pagination';
import { sortItems } from './sort';
import { deriveScopedGraphQueryData } from './visible';

function readSymbolMetadata(symbol: IAnalysisSymbol, field: string): string | undefined {
  const value = symbol.metadata?.[field];
  return typeof value === 'string' ? value : undefined;
}

function toSymbolReportBase(symbol: IAnalysisSymbol): GraphQuerySymbolReportItem {
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

function hasRelationshipFilters(config: GraphQuerySymbolsConfig): boolean {
  return Boolean(config.relatedFrom || config.relatedTo || config.edgeType);
}

function createSymbolMap(symbols: readonly IAnalysisSymbol[] | undefined): Map<string, IAnalysisSymbol> {
  return new Map((symbols ?? []).map((symbol) => [symbol.id, symbol]));
}

function optionalValueMatches<T>(expected: T | undefined, actual: T | undefined): boolean {
  return expected === undefined || actual === expected;
}

function relationMatchesConfig(relation: IAnalysisRelation, config: GraphQuerySymbolsConfig): boolean {
  const from = relation.fromNodeId ?? relation.fromFilePath;
  const to = relation.toNodeId ?? relation.toFilePath ?? undefined;

  return optionalValueMatches(config.relatedFrom, from)
    && optionalValueMatches(config.relatedTo, to)
    && optionalValueMatches(config.edgeType, relation.kind);
}

function toDeclarationSymbol(symbol: IAnalysisSymbol): GraphQuerySymbolReportItem {
  return {
    ...toSymbolReportBase(symbol),
    filePath: symbol.filePath,
  };
}

function toRelationshipSymbol(symbol: IAnalysisSymbol): GraphQuerySymbolReportItem {
  const item = toSymbolReportBase(symbol);
  if (item.kind === 'type') {
    delete item.kind;
  }
  return item;
}

function symbolIdForRelation(relation: IAnalysisRelation): string | undefined {
  return relation.toSymbolId ?? relation.fromSymbolId;
}

function findRelationshipSymbol(
  relation: IAnalysisRelation,
  symbolById: ReadonlyMap<string, IAnalysisSymbol>,
): IAnalysisSymbol | undefined {
  const symbolId = symbolIdForRelation(relation);
  return symbolId ? symbolById.get(symbolId) : undefined;
}

function shouldIncludeRelationshipSymbol(
  symbol: IAnalysisSymbol,
  config: GraphQuerySymbolsConfig,
  seen: ReadonlySet<string>,
): boolean {
  return (!config.filePath || symbol.filePath === config.filePath) && !seen.has(symbol.id);
}

function createRelationshipSymbols(
  data: GraphQueryData,
  config: GraphQuerySymbolsConfig,
): GraphQuerySymbolReportItem[] {
  const symbolById = createSymbolMap(getScopedSymbols(data, config));
  const symbols: GraphQuerySymbolReportItem[] = [];
  const seen = new Set<string>();

  for (const relation of data.relations ?? []) {
    if (!relationMatchesConfig(relation, config)) {
      continue;
    }

    const symbol = findRelationshipSymbol(relation, symbolById);
    if (!symbol || !shouldIncludeRelationshipSymbol(symbol, config, seen)) {
      continue;
    }

    seen.add(symbol.id);
    symbols.push(toRelationshipSymbol(symbol));
  }

  return symbols;
}

function createDeclarationSymbols(
  data: GraphQueryData,
  config: GraphQuerySymbolsConfig,
): GraphQuerySymbolReportItem[] {
  return getScopedSymbols(data, config)
    .filter((symbol) => !config.filePath || symbol.filePath === config.filePath)
    .map(toDeclarationSymbol);
}

function hasExplicitScope(config: GraphQuerySymbolsConfig): boolean {
  return Boolean(config.scope);
}

function getVisibleSymbolIds(data: GraphQueryData, config: GraphQuerySymbolsConfig): Set<string> {
  const scopedGraph = deriveScopedGraphQueryData(data.graphData, config);
  return new Set(scopedGraph.nodes
    .map((node) => node.symbol?.id)
    .filter((id): id is string => Boolean(id)));
}

function getScopedSymbols(data: GraphQueryData, config: GraphQuerySymbolsConfig): readonly IAnalysisSymbol[] {
  if (!hasExplicitScope(config)) {
    return data.symbols ?? [];
  }

  const visibleSymbolIds = getVisibleSymbolIds(data, config);
  return (data.symbols ?? []).filter((symbol) => visibleSymbolIds.has(symbol.id));
}

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

function readSymbolValue(symbol: GraphQuerySymbolReportItem, field: string): string {
  return SYMBOL_VALUE_READERS[field]?.(symbol) ?? '';
}

function applySymbolSearch(
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

export function listGraphSymbols(
  data: GraphQueryData,
  config: GraphQuerySymbolsConfig = {},
): GraphQuerySymbolReport {
  const baseSymbols = hasRelationshipFilters(config)
    ? createRelationshipSymbols(data, config)
    : createDeclarationSymbols(data, config);
  const filteredSymbols = applyReportFilters(baseSymbols, config.filters, readSymbolValue);
  const searchedSymbols = applySymbolSearch(filteredSymbols, config.search);
  const sortedSymbols = sortItems(
    searchedSymbols,
    config.sort,
    [
      { by: 'filePath', direction: 'asc' },
      { by: 'name', direction: 'asc' },
    ],
    readSymbolValue,
  );
  const page = paginate(sortedSymbols, config);

  return {
    symbols: page.items,
    page: page.page,
  };
}
