import { createFileNode, createQuerySymbol, createSymbolNode, filterRelations, getRelationSourceId, groupEdges, limitQueryResult } from './indexes';
import type { QueryContext, QueryOptions, QueryResult } from './model';

export function readSymbolDependents(
  symbolId: string,
  context: QueryContext,
  options: QueryOptions = {},
): QueryResult {
  const seedSymbol = context.symbols.get(symbolId);
  const relations = filterRelations(context.incomingSymbolRelations.get(symbolId) ?? [], options);
  const nodeIds = new Set<string>([symbolId]);
  const symbols = seedSymbol ? [seedSymbol] : [];
  const fileNodes = new Set<string>();

  for (const relation of relations) {
    const sourceId = getRelationSourceId(relation);
    if (!sourceId) {
      continue;
    }

    nodeIds.add(sourceId);
    if (relation.fromSymbolId) {
      const symbol = context.symbols.get(relation.fromSymbolId);
      if (symbol) {
        symbols.push(symbol);
      }
    } else {
      fileNodes.add(relation.fromFilePath);
    }
  }

  const nodes = [...nodeIds].flatMap((id) => {
    const symbol = context.symbols.get(id);
    if (symbol) {
      return [createSymbolNode(symbol)];
    }

    return fileNodes.has(id) ? [createFileNode(id)] : [];
  });

  return limitQueryResult({
    repo: context.repo,
    nodes,
    edges: groupEdges(relations, (relation) => ({
      from: getRelationSourceId(relation),
      to: relation.toSymbolId ?? relation.toFilePath ?? undefined,
    })),
    symbols: symbols.map((symbol) => createQuerySymbol(symbol)),
    summary: {
      symbolId,
      direction: 'incoming',
      relationCount: relations.length,
      kinds: [...new Set(relations.map((relation) => relation.kind))],
    },
    limitations: [],
  }, options);
}
