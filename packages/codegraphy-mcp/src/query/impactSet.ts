import { createFileNode, createQuerySymbol, createSymbolNode, filterRelations, getEffectiveMaxDepth, getRelationSourceId, getRelationTargetId, groupEdges, limitQueryResult } from './indexes';
import type { IAnalysisRelation } from '@codegraphy-vscode/plugin-api';
import type { ImpactDirection, QueryContext, QueryOptions, QueryResult } from './model';

export function readImpactSet(
  seedId: string,
  context: QueryContext,
  options: QueryOptions = {},
): QueryResult {
  const maxDepth = getEffectiveMaxDepth(options);
  const direction = resolveImpactDirection(seedId, options.direction);
  const seedIds = getSeedIds(seedId, context);
  const queue: Array<{ id: string; depth: number }> = seedIds.map((id) => ({ id, depth: 0 }));
  const visited = new Set<string>(seedIds);
  const traversedRelations: IAnalysisRelation[] = [];
  const traversedRelationKeys = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    if (current.depth >= maxDepth) {
      continue;
    }

    const relations = filterRelations(getAdjacentRelations(current.id, direction, context), options);
    for (const relation of relations) {
      const relationKey = createRelationTraversalKey(relation);
      if (!traversedRelationKeys.has(relationKey)) {
        traversedRelationKeys.add(relationKey);
        traversedRelations.push(relation);
      }

      for (const nextId of getAdjacentNodeIds(relation, current.id, direction)) {
        if (visited.has(nextId)) {
          continue;
        }

        visited.add(nextId);
        queue.push({ id: nextId, depth: current.depth + 1 });
      }
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
    edges: groupEdges(traversedRelations, (relation) => ({
      from: getRelationSourceId(relation),
      to: getRelationTargetId(relation),
    })),
    symbols,
    summary: {
      seedId,
      direction,
      maxDepth,
      relationCount: traversedRelations.length,
      nodeCount: nodes.length,
      kinds: [...new Set(traversedRelations.map((relation) => relation.kind))],
    },
    limitations: [],
  }, options);
}

function getSeedIds(seedId: string, context: QueryContext): string[] {
  const symbolIds = context.symbolsByFile.get(seedId)?.map((symbol) => symbol.id) ?? [];
  return [seedId, ...symbolIds];
}

function resolveImpactDirection(
  seedId: string,
  direction: ImpactDirection | undefined,
): ImpactDirection {
  if (direction) {
    return direction;
  }

  return seedId.startsWith('symbol:') ? 'outgoing' : 'incoming';
}

function getAdjacentRelations(
  currentId: string,
  direction: ImpactDirection,
  context: QueryContext,
): IAnalysisRelation[] {
  switch (direction) {
    case 'incoming':
      return context.hybridIncoming.get(currentId) ?? [];
    case 'both':
      return [
        ...(context.hybridOutgoing.get(currentId) ?? []),
        ...(context.hybridIncoming.get(currentId) ?? []),
      ];
    default:
      return context.hybridOutgoing.get(currentId) ?? [];
  }
}

function getAdjacentNodeIds(
  relation: IAnalysisRelation,
  currentId: string,
  direction: ImpactDirection,
): string[] {
  const sourceId = getRelationSourceId(relation);
  const targetId = getRelationTargetId(relation);

  if (direction === 'incoming') {
    return sourceId ? [sourceId] : [];
  }

  if (direction === 'outgoing') {
    return targetId ? [targetId] : [];
  }

  const adjacent = new Set<string>();
  if (sourceId && sourceId !== currentId) {
    adjacent.add(sourceId);
  }
  if (targetId && targetId !== currentId) {
    adjacent.add(targetId);
  }
  return [...adjacent];
}

function createRelationTraversalKey(relation: IAnalysisRelation): string {
  return [
    relation.kind,
    relation.sourceId,
    relation.fromFilePath,
    relation.toFilePath ?? '',
    relation.fromSymbolId ?? '',
    relation.toSymbolId ?? '',
    relation.specifier ?? '',
  ].join('::');
}
