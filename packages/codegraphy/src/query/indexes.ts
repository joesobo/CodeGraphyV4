import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-vscode/plugin-api';
import type { DatabaseSnapshot } from '../database/model';
import type { QueryContext, QueryEdge, QueryNode, QueryOptions, QueryResult, QuerySymbol } from './model';

const DEFAULT_MAX_DEPTH = 2;
const DEFAULT_MAX_RESULTS = 50;

export function getEffectiveMaxDepth(options: QueryOptions): number {
  return options.maxDepth ?? DEFAULT_MAX_DEPTH;
}

export function getEffectiveMaxResults(options: QueryOptions): number {
  return options.maxResults ?? DEFAULT_MAX_RESULTS;
}

export function createQueryContext(repo: string, snapshot: DatabaseSnapshot): QueryContext {
  const files = new Set<string>();
  const symbols = new Map<string, IAnalysisSymbol>();
  const symbolsByFile = new Map<string, IAnalysisSymbol[]>();
  const outgoingFileRelations = new Map<string, IAnalysisRelation[]>();
  const incomingFileRelations = new Map<string, IAnalysisRelation[]>();
  const outgoingSymbolRelations = new Map<string, IAnalysisRelation[]>();
  const incomingSymbolRelations = new Map<string, IAnalysisRelation[]>();
  const hybridOutgoing = new Map<string, IAnalysisRelation[]>();

  for (const file of snapshot.files) {
    files.add(file.filePath);
  }

  for (const symbol of snapshot.symbols) {
    symbols.set(symbol.id, symbol);
    files.add(symbol.filePath);
    const current = symbolsByFile.get(symbol.filePath) ?? [];
    current.push(symbol);
    symbolsByFile.set(symbol.filePath, current);
  }

  for (const relation of snapshot.relations) {
    files.add(relation.fromFilePath);
    if (relation.toFilePath) {
      files.add(relation.toFilePath);
    }

    pushRelation(outgoingFileRelations, relation.fromFilePath, relation);
    if (relation.toFilePath) {
      pushRelation(incomingFileRelations, relation.toFilePath, relation);
    }

    if (relation.fromSymbolId) {
      pushRelation(outgoingSymbolRelations, relation.fromSymbolId, relation);
    }
    if (relation.toSymbolId) {
      pushRelation(incomingSymbolRelations, relation.toSymbolId, relation);
    }

    const fromId = getRelationSourceId(relation);
    const toId = getRelationTargetId(relation);
    if (fromId && toId) {
      pushRelation(hybridOutgoing, fromId, relation);
    }
  }

  return {
    repo,
    files,
    symbols,
    symbolsByFile,
    relations: snapshot.relations,
    outgoingFileRelations,
    incomingFileRelations,
    outgoingSymbolRelations,
    incomingSymbolRelations,
    hybridOutgoing,
  };
}

function pushRelation(map: Map<string, IAnalysisRelation[]>, key: string, relation: IAnalysisRelation): void {
  const current = map.get(key) ?? [];
  current.push(relation);
  map.set(key, current);
}

export function filterRelations(relations: readonly IAnalysisRelation[], options: QueryOptions): IAnalysisRelation[] {
  if (!options.kinds || options.kinds.length === 0) {
    return [...relations];
  }

  const allowedKinds = new Set(options.kinds);
  return relations.filter((relation) => allowedKinds.has(relation.kind));
}

export function createFileNode(filePath: string): QueryNode {
  return {
    id: filePath,
    kind: 'file',
    label: filePath.split('/').at(-1) ?? filePath,
    filePath,
  };
}

export function createSymbolNode(symbol: IAnalysisSymbol): QueryNode {
  return {
    id: symbol.id,
    kind: 'symbol',
    label: symbol.name,
    filePath: symbol.filePath,
    symbolKind: symbol.kind,
  };
}

export function createQuerySymbol(symbol: IAnalysisSymbol): QuerySymbol {
  return {
    id: symbol.id,
    name: symbol.name,
    kind: symbol.kind,
    filePath: symbol.filePath,
    signature: symbol.signature,
  };
}

export function groupEdges(
  relations: readonly IAnalysisRelation[],
  edgeIdReader: (relation: IAnalysisRelation) => { from: string | undefined; to: string | undefined },
): QueryEdge[] {
  const grouped = new Map<string, QueryEdge>();

  for (const relation of relations) {
    const ids = edgeIdReader(relation);
    if (!ids.from || !ids.to) {
      continue;
    }

    const key = `${ids.from}->${ids.to}#${relation.kind}`;
    const current = grouped.get(key);
    if (current) {
      current.supportCount += 1;
      continue;
    }

    grouped.set(key, {
      from: ids.from,
      to: ids.to,
      kind: relation.kind,
      supportCount: 1,
    });
  }

  return [...grouped.values()];
}

export function limitQueryResult(result: QueryResult, options: QueryOptions): QueryResult {
  const maxResults = getEffectiveMaxResults(options);
  return {
    ...result,
    nodes: result.nodes.slice(0, maxResults),
    edges: result.edges.slice(0, maxResults),
    symbols: result.symbols.slice(0, maxResults),
  };
}

export function getRelationSourceId(relation: IAnalysisRelation): string | undefined {
  return relation.fromSymbolId ?? relation.fromFilePath;
}

export function getRelationTargetId(relation: IAnalysisRelation): string | undefined {
  return relation.toSymbolId ?? relation.toFilePath ?? undefined;
}
