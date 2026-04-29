import type { IAnalysisSymbol } from '@codegraphy-vscode/plugin-api';
import { createFileNode, createQuerySymbol, filterRelations, groupEdges, limitQueryResult } from './indexes';
import type { QueryContext, QueryOptions, QueryResult } from './model';

export function readFileDependencies(
  filePath: string,
  context: QueryContext,
  options: QueryOptions = {},
): QueryResult {
  const relations = filterRelations(context.outgoingFileRelations.get(filePath) ?? [], options)
    .filter((relation) => relation.toFilePath);
  const relatedFiles = new Set<string>([filePath, ...relations.flatMap((relation) => relation.toFilePath ? [relation.toFilePath] : [])]);
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
      direction: 'outgoing',
      relationCount: relations.length,
      relatedFileCount: Math.max(relatedFiles.size - 1, 0),
      kinds: [...new Set(relations.map((relation) => relation.kind))],
    },
    limitations: [],
  }, options);
}
