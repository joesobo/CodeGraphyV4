import type { IAnalysisRelation, IAnalysisSymbol } from '../../plugins/types/contracts';
import type { GraphQueryData } from '../data';
import type { GraphQuerySymbolReportItem, GraphQuerySymbolsConfig } from '../model';
import { toSymbolReportBase } from './metadata';
import { getScopedSymbols } from './scope';

export function hasRelationshipFilters(config: GraphQuerySymbolsConfig): boolean {
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

export function createRelationshipSymbols(
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
