import { createFileNode, createQuerySymbol, createSymbolNode, filterRelations, getEffectiveMaxDepth, getRelationSourceId, getRelationTargetId, groupEdges, limitQueryResult } from './indexes';
import type { IAnalysisRelation } from '@codegraphy-vscode/plugin-api';
import type { ExplainRelationshipInput, QueryContext, QueryResult } from './model';

function readDirectRelations(from: string, to: string, context: QueryContext, input: ExplainRelationshipInput): IAnalysisRelation[] {
  if (from.startsWith('symbol:')) {
    return filterRelations(context.outgoingSymbolRelations.get(from) ?? [], input)
      .filter((relation) => getRelationTargetId(relation) === to);
  }

  return filterRelations(context.outgoingFileRelations.get(from) ?? [], input)
    .filter((relation) => relation.toFilePath === to);
}

function readShortestPath(from: string, to: string, context: QueryContext, input: ExplainRelationshipInput): IAnalysisRelation[] {
  const maxDepth = getEffectiveMaxDepth(input);
  const queue: Array<{ id: string; depth: number }> = [{ id: from, depth: 0 }];
  const previous = new Map<string, { parent: string; relation: IAnalysisRelation }>();
  const visited = new Set<string>([from]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    if (current.depth >= maxDepth) {
      continue;
    }

    const relations = current.id.startsWith('symbol:')
      ? filterRelations(context.outgoingSymbolRelations.get(current.id) ?? [], input)
      : filterRelations(context.outgoingFileRelations.get(current.id) ?? [], input);

    for (const relation of relations) {
      const nextId = getRelationTargetId(relation);
      if (!nextId || visited.has(nextId)) {
        continue;
      }

      previous.set(nextId, { parent: current.id, relation });
      if (nextId === to) {
        return reconstructPath(to, previous);
      }

      visited.add(nextId);
      queue.push({ id: nextId, depth: current.depth + 1 });
    }
  }

  return [];
}

function reconstructPath(targetId: string, previous: Map<string, { parent: string; relation: IAnalysisRelation }>): IAnalysisRelation[] {
  const path: IAnalysisRelation[] = [];
  let currentId: string | undefined = targetId;

  while (currentId && previous.has(currentId)) {
    const entry = previous.get(currentId);
    if (!entry) {
      break;
    }

    path.push(entry.relation);
    currentId = entry.parent;
  }

  return path.reverse();
}

type MatchedDirection = 'forward' | 'reverse' | 'none';

interface MatchedRelationship {
  direct: boolean;
  matchedDirection: MatchedDirection;
  relations: IAnalysisRelation[];
}

function matchRelationship(
  from: string,
  to: string,
  context: QueryContext,
  input: ExplainRelationshipInput,
): MatchedRelationship {
  const forwardDirect = readDirectRelations(from, to, context, input);
  if (forwardDirect.length > 0) {
    return {
      direct: true,
      matchedDirection: 'forward',
      relations: forwardDirect,
    };
  }

  const forwardPath = readShortestPath(from, to, context, input);
  if (forwardPath.length > 0) {
    return {
      direct: false,
      matchedDirection: 'forward',
      relations: forwardPath,
    };
  }

  const reverseDirect = readDirectRelations(to, from, context, input);
  if (reverseDirect.length > 0) {
    return {
      direct: true,
      matchedDirection: 'reverse',
      relations: reverseDirect,
    };
  }

  const reversePath = readShortestPath(to, from, context, input);
  if (reversePath.length > 0) {
    return {
      direct: false,
      matchedDirection: 'reverse',
      relations: reversePath,
    };
  }

  return {
    direct: false,
    matchedDirection: 'none',
    relations: [],
  };
}

export function explainRelationship(
  input: ExplainRelationshipInput,
  context: QueryContext,
): QueryResult {
  const matched = matchRelationship(input.from, input.to, context, input);
  const pathRelations = matched.relations;
  const ids = new Set<string>([input.from, input.to]);

  for (const relation of pathRelations) {
    const sourceId = getRelationSourceId(relation);
    const targetId = getRelationTargetId(relation);
    if (sourceId) {
      ids.add(sourceId);
    }
    if (targetId) {
      ids.add(targetId);
    }
  }

  const nodes = [...ids].flatMap((id) => {
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

  const limitations = pathRelations.length === 0 ? ['No direct or bounded path found.'] : [];

  return limitQueryResult({
    repo: context.repo,
    nodes,
    edges: groupEdges(pathRelations, (relation) => ({
      from: getRelationSourceId(relation),
      to: getRelationTargetId(relation),
    })),
    symbols,
    summary: {
      from: input.from,
      to: input.to,
      direct: matched.direct,
      matchedDirection: matched.matchedDirection,
      relationCount: pathRelations.length,
      kinds: [...new Set(pathRelations.map((relation) => relation.kind))],
    },
    limitations,
  }, input);
}
