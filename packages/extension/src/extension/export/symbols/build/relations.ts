import type { IAnalysisRelation } from '../../../../core/plugins/types/contracts';

export function relationSortKey(relation: IAnalysisRelation): string {
  return `${relation.fromFilePath}:${relation.kind}:${relation.toFilePath ?? ''}:${relation.fromSymbolId ?? ''}:${relation.toSymbolId ?? ''}`;
}

export function sortRelations(relations: readonly IAnalysisRelation[]): IAnalysisRelation[] {
  return [...relations].sort((left, right) => relationSortKey(left).localeCompare(relationSortKey(right)));
}

export function normalizeRelationFilePaths(
  relation: IAnalysisRelation,
  resolveFilePath: (filePath: string) => string,
): IAnalysisRelation {
  return {
    ...relation,
    fromFilePath: resolveFilePath(relation.fromFilePath),
    toFilePath: relation.toFilePath ? resolveFilePath(relation.toFilePath) : undefined,
  };
}
