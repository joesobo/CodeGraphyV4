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

function relationMatchesConfig(relation: IAnalysisRelation, config: GraphQuerySymbolsConfig): boolean {
  const from = relation.fromNodeId ?? relation.fromFilePath;
  const to = relation.toNodeId ?? relation.toFilePath ?? undefined;

  if (config.relatedFrom && from !== config.relatedFrom) {
    return false;
  }
  if (config.relatedTo && to !== config.relatedTo) {
    return false;
  }
  if (config.edgeType && relation.kind !== config.edgeType) {
    return false;
  }

  return true;
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

    const symbolId = relation.toSymbolId ?? relation.fromSymbolId;
    const symbol = symbolId ? symbolById.get(symbolId) : undefined;
    if (!symbol) {
      continue;
    }
    if (config.filePath && symbol.filePath !== config.filePath) {
      continue;
    }
    if (seen.has(symbol.id)) {
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
