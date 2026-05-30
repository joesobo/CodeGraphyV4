import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import {
  getRelationshipEvidenceSourceNodeId,
  getRelationshipEvidenceSourceSymbolId,
  getRelationshipEvidenceSourceFilePath,
  getRelationshipEvidenceSpecifier,
  getRelationshipEvidenceTargetNodeId,
  getRelationshipEvidenceTargetSymbolId,
  materializeRelationshipTargetPath,
} from '../../../../analysis/relationshipEvidence';

function getBaseRelationKeyParts(
  analysisFilePath: string,
  relation: NonNullable<IFileAnalysisResult['relations']>[number],
): string[] {
  return [
    relation.edgeType,
    relation.sourceId,
    getRelationshipEvidenceSourceFilePath(relation, analysisFilePath),
    getRelationshipEvidenceSourceNodeId(relation) ?? '',
    getRelationshipEvidenceSourceSymbolId(relation) ?? '',
    getRelationshipEvidenceSpecifier(relation),
    relation.timing ?? '',
    relation.variant ?? '',
  ];
}

function getResolvedRelationKeyParts(
  workspaceRoot: string,
  relation: NonNullable<IFileAnalysisResult['relations']>[number],
): string[] {
  return [
    materializeRelationshipTargetPath(relation.target, workspaceRoot) ?? '',
    getRelationshipEvidenceTargetNodeId(relation) ?? '',
    getRelationshipEvidenceTargetSymbolId(relation) ?? '',
  ];
}

export function getRelationKey(
  analysisFilePath: string,
  relation: NonNullable<IFileAnalysisResult['relations']>[number],
): string {
  const key = getBaseRelationKeyParts(analysisFilePath, relation);

  if (relation.edgeType === 'call' || relation.edgeType === 'reference') {
    key.push(...getResolvedRelationKeyParts('', relation));
  } else if (getRelationshipEvidenceTargetNodeId(relation) || getRelationshipEvidenceTargetSymbolId(relation)) {
    key.push(getRelationshipEvidenceTargetNodeId(relation) ?? '', getRelationshipEvidenceTargetSymbolId(relation) ?? '');
  }

  return key.join('|');
}
