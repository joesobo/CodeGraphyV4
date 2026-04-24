import { createFileNode, createQuerySymbol, createSymbolNode, filterRelations, getEffectiveMaxDepth, getRelationSourceId, getRelationTargetId, limitQueryResult } from './indexes';
import type { IAnalysisRelation } from '@codegraphy-vscode/plugin-api';
import type { QueryContext, QueryOptions, QueryResult } from './model';

export function readImpactSet(
  seedId: string,
  context: QueryContext,
  options: QueryOptions = {},
): QueryResult {
  const maxDepth = getEffectiveMaxDepth(options);
  const queue: Array<{ id: string; depth: number }> = [{ id: seedId, depth: 0 }];
  const visited = new Set<string>([seedId]);
  const traversedRelations: IAnalysisRelation[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    if (current.depth >= maxDepth) {
      continue;
    }

    const relations = filterRelations(context.hybridOutgoing.get(current.id) ?? [], options);
    for (const relation of relations) {
      const nextId = getRelationTargetId(relation);
      if (!nextId) {
        continue;
      }

      traversedRelations.push(relation);
      if (visited.has(nextId)) {
        continue;
      }

      visited.add(nextId);
      queue.push({ id: nextId, depth: current.depth + 1 });
    }
  }

  const nodes = [...visited].flatMap((id) => {
    const symbol = context.symbols.get(id);
    if (symbol) {
      return [createSymbolNode(symbol)];
    }

    return context.files.has(id) ? [createFileNode(id)] : [];
  });
  const symbols = nodes
    .filter((node) => node.kind === 'symbol')
    .flatMap((node) => {
      const symbol = context.symbols.get(node.id);
      return symbol ? [createQuerySymbol(symbol)] : [];
    });

  return limitQueryResult({
    repo: context.repo,
    nodes,
    edges: traversedRelations.flatMap((relation) => {
      const from = getRelationSourceId(relation);
      const to = getRelationTargetId(relation);
      return from && to ? [{
        from,
        to,
        kind: relation.kind,
        supportCount: 1,
      }] : [];
    }),
    symbols,
    summary: {
      seedId,
      maxDepth,
      relationCount: traversedRelations.length,
      nodeCount: nodes.length,
    },
    limitations: [],
  }, options);
}
