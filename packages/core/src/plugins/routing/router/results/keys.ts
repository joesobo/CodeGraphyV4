import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';

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

  if (relation.kind === 'call' || relation.kind === 'reference' || relation.kind === 'event') {
    key.push(...getResolvedRelationKeyParts(relation));
  } else if (relation.toNodeId || relation.toSymbolId) {
    key.push(relation.toNodeId ?? '', relation.toSymbolId ?? '');
  }

  return key.join('|');
}
