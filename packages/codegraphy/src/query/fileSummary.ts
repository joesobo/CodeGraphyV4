import { createQuerySymbol, filterRelations, limitQueryResult } from './indexes';
import type { QueryContext, QueryOptions, QueryResult } from './model';

export function readFileSummary(
  filePath: string,
  context: QueryContext,
  options: QueryOptions = {},
): QueryResult {
  const declaredSymbols = context.symbolsByFile.get(filePath) ?? [];
  const outgoingRelations = filterRelations(context.outgoingFileRelations.get(filePath) ?? [], options);
  const incomingRelations = filterRelations(context.incomingFileRelations.get(filePath) ?? [], options);
  const relationKinds = [...new Set([...outgoingRelations, ...incomingRelations].map((relation) => relation.kind))];

  return limitQueryResult({
    repo: context.repo,
    nodes: [],
    edges: [],
    symbols: declaredSymbols.map((symbol) => createQuerySymbol(symbol)),
    summary: {
      filePath,
      declaredSymbolCount: declaredSymbols.length,
      outgoingRelationCount: outgoingRelations.length,
      incomingRelationCount: incomingRelations.length,
      topKinds: relationKinds,
    },
    limitations: [],
  }, options);
}
