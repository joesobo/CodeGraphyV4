import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';
import {
  getRelationshipEvidenceSourceFilePath,
  getRelationshipEvidenceSourceSymbolId,
  getRelationshipEvidenceSpecifier,
  getRelationshipEvidenceTargetSymbolId,
  materializeRelationshipTargetPath,
} from '../../../analysis/relationshipEvidence';

function escapeCypherString(value: string): string {
  return JSON.stringify(value);
}

function createCypherStringProperty(key: string, value: string): string {
  return `${key}: ${escapeCypherString(value)}`;
}

function createRelationRowId(
  filePath: string,
  relation: IAnalysisRelationshipEvidence,
  workspaceRoot: string,
  index: number,
): string {
  return [
    filePath,
    relation.edgeType,
    relation.sourceId,
    getRelationshipEvidenceSourceFilePath(relation, filePath),
    materializeRelationshipTargetPath(relation.target, workspaceRoot) ?? '',
    getRelationshipEvidenceSourceSymbolId(relation) ?? '',
    getRelationshipEvidenceTargetSymbolId(relation) ?? '',
    getRelationshipEvidenceSpecifier(relation),
    relation.timing ?? '',
    relation.variant ?? '',
    String(index),
  ].join('|');
}

export function createRelationIdentityProperties(
  filePath: string,
  relation: IAnalysisRelationshipEvidence,
  relationIndex: number,
  workspaceRoot: string,
): string[] {
  return [
    createCypherStringProperty('relationId', createRelationRowId(filePath, relation, workspaceRoot, relationIndex)),
    createCypherStringProperty('filePath', filePath),
    createCypherStringProperty('kind', relation.edgeType),
    createCypherStringProperty('sourceId', relation.sourceId),
  ];
}
