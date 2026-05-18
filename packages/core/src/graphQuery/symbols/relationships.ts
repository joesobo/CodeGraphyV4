import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy/plugin-api';
import type { GraphQueryData } from '../data';
import type { GraphQuerySymbolReportItem, GraphQuerySymbolsConfig } from '../model';
import { toSymbolReportBase } from './metadata';
import { relationMatchesConfig } from './relationshipFilters';
import { getScopedSymbols } from './scope';

export { hasRelationshipFilters } from './relationshipFilters';

function createSymbolMap(symbols: readonly IAnalysisSymbol[]): Map<string, IAnalysisSymbol> {
  return new Map(symbols.map((symbol) => [symbol.id, symbol]));
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
  if (!data.relations?.length) {
    return [];
  }

  const symbolById = createSymbolMap(getScopedSymbols(data, config));
  const symbols: GraphQuerySymbolReportItem[] = [];
  const seen = new Set<string>();

  for (const relation of data.relations) {
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
