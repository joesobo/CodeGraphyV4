import type { IFileAnalysisResult } from '../../../types/contracts';

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
