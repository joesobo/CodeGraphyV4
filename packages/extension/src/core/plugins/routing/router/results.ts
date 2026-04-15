import type { IFileAnalysisResult, IPlugin, IProjectedConnection } from '../../types/contracts';

function getBaseRelationKeyParts(
  relation: NonNullable<IFileAnalysisResult['relations']>[number],
): string[] {
  return [
    relation.kind,
    relation.sourceId,
    relation.fromFilePath,
    relation.fromNodeId ?? '',
    relation.fromSymbolId ?? '',
    relation.specifier ?? '',
    relation.type ?? '',
    relation.variant ?? '',
  ];
}

function getResolvedRelationKeyParts(
  relation: NonNullable<IFileAnalysisResult['relations']>[number],
): string[] {
  return [
    relation.toFilePath ?? '',
    relation.toNodeId ?? '',
    relation.toSymbolId ?? '',
    relation.resolvedPath ?? '',
  ];
}

export function getRelationKey(relation: NonNullable<IFileAnalysisResult['relations']>[number]): string {
  const key = getBaseRelationKeyParts(relation);

  if (relation.kind === 'call' || relation.kind === 'reference') {
    key.push(...getResolvedRelationKeyParts(relation));
  }

  return key.join('|');
}

export function createEmptyFileAnalysisResult(filePath: string): IFileAnalysisResult {
  return {
    filePath,
    edgeTypes: [],
    nodeTypes: [],
    nodes: [],
    relations: [],
    symbols: [],
  };
}

export function mergeById<TItem extends { id: string }>(
  baseItems: TItem[] | undefined,
  nextItems: TItem[] | undefined,
): TItem[] {
  const merged = new Map<string, TItem>();

  for (const item of baseItems ?? []) {
    merged.set(item.id, item);
  }

  for (const item of nextItems ?? []) {
    merged.set(item.id, item);
  }

  return [...merged.values()];
}

export function mergeRelations(
  baseRelations: NonNullable<IFileAnalysisResult['relations']> | undefined,
  nextRelations: NonNullable<IFileAnalysisResult['relations']> | undefined,
): NonNullable<IFileAnalysisResult['relations']> {
  const merged = new Map<string, NonNullable<IFileAnalysisResult['relations']>[number]>();

  for (const relation of baseRelations ?? []) {
    merged.set(getRelationKey(relation), relation);
  }

  for (const relation of nextRelations ?? []) {
    merged.set(getRelationKey(relation), relation);
  }

  return [...merged.values()];
}

export function mergeFileAnalysisResults(
  baseResult: IFileAnalysisResult,
  nextResult: IFileAnalysisResult,
): IFileAnalysisResult {
  return {
    filePath: nextResult.filePath || baseResult.filePath,
    edgeTypes: mergeById(baseResult.edgeTypes, nextResult.edgeTypes),
    nodeTypes: mergeById(baseResult.nodeTypes, nextResult.nodeTypes),
    nodes: mergeById(baseResult.nodes, nextResult.nodes),
    relations: mergeRelations(baseResult.relations, nextResult.relations),
    symbols: mergeById(baseResult.symbols, nextResult.symbols),
  };
}

export function withPluginProvenance(
  plugin: IPlugin,
  result: IFileAnalysisResult,
): IFileAnalysisResult {
  return {
    ...result,
    relations: result.relations?.map((relation) => ({
      ...relation,
      pluginId: relation.pluginId ?? plugin.id,
    })),
  };
}

export function toProjectedConnectionsFromFileAnalysis(analysis: IFileAnalysisResult): IProjectedConnection[] {
  return (analysis.relations ?? []).map(relation => ({
    kind: relation.kind,
    pluginId: relation.pluginId,
    sourceId: relation.sourceId,
    specifier: relation.specifier ?? '',
    resolvedPath: relation.resolvedPath ?? relation.toFilePath ?? null,
    type: relation.type,
    variant: relation.variant,
    metadata: relation.metadata,
  }));
}
