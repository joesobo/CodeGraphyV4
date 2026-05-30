import type { IAnalysisRelationshipEvidence } from '../../../../core/plugins/types/contracts';
import { materializeRelationshipTargetPath } from '@codegraphy-dev/core';

function relationSourceFilePath(relation: IAnalysisRelationshipEvidence): string {
  if (relation.from?.kind === 'symbol') {
    return relation.from.filePath ?? '';
  }

  return relation.from?.kind === 'file' ? relation.from.filePath ?? '' : '';
}

function relationTargetFilePath(relation: IAnalysisRelationshipEvidence): string {
  if (relation.target.kind === 'symbol') {
    return relation.target.filePath ?? '';
  }

  return materializeRelationshipTargetPath(relation.target, '') ?? '';
}

export function relationSortKey(relation: IAnalysisRelationshipEvidence): string {
  return `${relationSourceFilePath(relation)}:${relation.edgeType}:${relationTargetFilePath(relation)}:${relation.from?.kind === 'symbol' ? relation.from.symbolId : ''}:${relation.target.kind === 'symbol' ? relation.target.symbolId : ''}`;
}

export function sortRelations(relations: readonly IAnalysisRelationshipEvidence[]): IAnalysisRelationshipEvidence[] {
  return [...relations].sort((left, right) => relationSortKey(left).localeCompare(relationSortKey(right)));
}

export function normalizeRelationFilePaths(
  relation: IAnalysisRelationshipEvidence,
  resolveFilePath: (filePath: string) => string,
): IAnalysisRelationshipEvidence {
  return {
    ...relation,
    from: relation.from?.kind === 'file'
      ? { ...relation.from, filePath: relation.from.filePath ? resolveFilePath(relation.from.filePath) : relation.from.filePath }
      : relation.from?.kind === 'symbol'
        ? { ...relation.from, filePath: relation.from.filePath ? resolveFilePath(relation.from.filePath) : relation.from.filePath }
        : relation.from,
    target: relation.target.kind === 'file'
      ? { ...relation.target, path: resolveFilePath(relation.target.path) }
      : relation.target.kind === 'symbol'
        ? { ...relation.target, filePath: relation.target.filePath ? resolveFilePath(relation.target.filePath) : relation.target.filePath }
        : relation.target,
  };
}
