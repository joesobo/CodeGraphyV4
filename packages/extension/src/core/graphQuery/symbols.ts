import { applyReportFilters } from './filter';
import type { GraphQueryData } from './data';
import type {
  GraphQuerySymbolReport,
  GraphQuerySymbolsConfig,
} from './model';
import { paginate } from './pagination';
import { sortItems } from './sort';
import { createDeclarationSymbols } from './symbols/declarations';
import { createRelationshipSymbols, hasRelationshipFilters } from './symbols/relationships';
import { applySymbolSearch, readSymbolValue } from './symbols/values';

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
