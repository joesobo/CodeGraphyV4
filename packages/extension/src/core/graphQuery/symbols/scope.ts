import type { IAnalysisSymbol } from '../../plugins/types/contracts';
import type { GraphQueryData } from '../data';
import type { GraphQuerySymbolsConfig } from '../model';
import { deriveScopedGraphQueryData } from '../visible';

function hasExplicitScope(config: GraphQuerySymbolsConfig): boolean {
  return Boolean(config.scope);
}

function getVisibleSymbolIds(data: GraphQueryData, config: GraphQuerySymbolsConfig): Set<string> {
  const scopedGraph = deriveScopedGraphQueryData(data.graphData, config);
  return new Set(scopedGraph.nodes
    .map((node) => node.symbol?.id)
    .filter((id): id is string => Boolean(id)));
}

export function getScopedSymbols(data: GraphQueryData, config: GraphQuerySymbolsConfig): readonly IAnalysisSymbol[] {
  if (!hasExplicitScope(config)) {
    return data.symbols ?? [];
  }

  const visibleSymbolIds = getVisibleSymbolIds(data, config);
  return (data.symbols ?? []).filter((symbol) => visibleSymbolIds.has(symbol.id));
}
