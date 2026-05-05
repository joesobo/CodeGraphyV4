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
    filePath: symbol.filePath,
    name: symbol.name,
    kind: symbol.kind,
    ...(symbol.range ? { range: symbol.range } : {}),
  };
}

function toRelationshipSymbol(symbol: IAnalysisSymbol): GraphQuerySymbolReportItem {
  return {
    name: symbol.name,
    ...(symbol.kind && symbol.kind !== 'type' ? { kind: symbol.kind } : {}),
    ...(symbol.range ? { range: symbol.range } : {}),
  };
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
  const symbolById = createSymbolMap(data.symbols);
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
  return (data.symbols ?? [])
    .filter((symbol) => !config.filePath || symbol.filePath === config.filePath)
    .map(toDeclarationSymbol);
}

function readSymbolValue(symbol: GraphQuerySymbolReportItem, field: string): string {
  switch (field) {
    case 'filePath':
      return symbol.filePath ?? '';
    case 'kind':
      return symbol.kind ?? '';
    case 'name':
      return symbol.name;
    default:
      return '';
  }
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
    `${symbol.filePath ?? ''} ${symbol.name} ${symbol.kind ?? ''}`.toLowerCase().includes(query)
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
