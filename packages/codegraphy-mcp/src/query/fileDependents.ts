import type { IAnalysisSymbol } from '@codegraphy-vscode/plugin-api';
import { createFileNode, createQuerySymbol, filterRelations, groupEdges, limitQueryResult } from './indexes';
import type { QueryContext, QueryOptions, QueryResult } from './model';

export function readFileDependents(
  filePath: string,
  context: QueryContext,
  options: QueryOptions = {},
): QueryResult {
  const relations = filterRelations(context.incomingFileRelations.get(filePath) ?? [], options);
  const relatedFiles = new Set<string>([filePath, ...relations.map((relation) => relation.fromFilePath)]);
  const relatedSymbols = relations.flatMap((relation) => [
    relation.fromSymbolId ? context.symbols.get(relation.fromSymbolId) : undefined,
    relation.toSymbolId ? context.symbols.get(relation.toSymbolId) : undefined,
  ].filter((symbol): symbol is IAnalysisSymbol => Boolean(symbol)));

  return limitQueryResult({
    repo: context.repo,
    nodes: [...relatedFiles].map((currentFilePath) => createFileNode(currentFilePath)),
    edges: groupEdges(relations, (relation) => ({
      from: relation.fromFilePath,
      to: relation.toFilePath ?? undefined,
    })),
    symbols: relatedSymbols.map((symbol) => createQuerySymbol(symbol)),
    summary: {
      filePath,
      direction: 'incoming',
      relationCount: relations.length,
      relatedFileCount: Math.max(relatedFiles.size - 1, 0),
      kinds: [...new Set(relations.map((relation) => relation.kind))],
    },
    limitations: [],
  }, options);
}
