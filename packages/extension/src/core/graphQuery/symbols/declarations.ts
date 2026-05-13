import type { IAnalysisSymbol } from '../../plugins/types/contracts';
import type { GraphQueryData } from '../data';
import type { GraphQuerySymbolReportItem, GraphQuerySymbolsConfig } from '../model';
import { toSymbolReportBase } from './metadata';
import { getScopedSymbols } from './scope';

function toDeclarationSymbol(symbol: IAnalysisSymbol): GraphQuerySymbolReportItem {
  return {
    ...toSymbolReportBase(symbol),
    filePath: symbol.filePath,
  };
}

export function createDeclarationSymbols(
  data: GraphQueryData,
  config: GraphQuerySymbolsConfig,
): GraphQuerySymbolReportItem[] {
  return getScopedSymbols(data, config)
    .filter((symbol) => !config.filePath || symbol.filePath === config.filePath)
    .map(toDeclarationSymbol);
}
