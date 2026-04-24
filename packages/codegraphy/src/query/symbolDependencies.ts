import { createFileNode, createQuerySymbol, createSymbolNode, filterRelations, getRelationTargetId, groupEdges, limitQueryResult } from './indexes';
import type { QueryContext, QueryOptions, QueryResult } from './model';

export function readSymbolDependencies(
  symbolId: string,
  context: QueryContext,
  options: QueryOptions = {},
): QueryResult {
  const seedSymbol = context.symbols.get(symbolId);
  const relations = filterRelations(context.outgoingSymbolRelations.get(symbolId) ?? [], options);
  const nodeIds = new Set<string>([symbolId]);
  const symbols = seedSymbol ? [seedSymbol] : [];
  const fileNodes = new Set<string>();

  for (const relation of relations) {
    const targetId = getRelationTargetId(relation);
    if (!targetId) {
      continue;
    }

    nodeIds.add(targetId);
    if (relation.toSymbolId) {
      const symbol = context.symbols.get(relation.toSymbolId);
      if (symbol) {
        symbols.push(symbol);
      }
    } else if (relation.toFilePath) {
      fileNodes.add(relation.toFilePath);
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
      from: relation.fromSymbolId ?? relation.fromFilePath,
      to: getRelationTargetId(relation),
    })),
    symbols: symbols.map((symbol) => createQuerySymbol(symbol)),
    summary: {
      symbolId,
      direction: 'outgoing',
      relationCount: relations.length,
      kinds: [...new Set(relations.map((relation) => relation.kind))],
    },
    limitations: [],
  }, options);
}
