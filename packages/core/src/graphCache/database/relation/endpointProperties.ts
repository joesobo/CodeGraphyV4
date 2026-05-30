import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';
import {
  getRelationshipEvidenceSourceFilePath,
  getRelationshipEvidenceSourceNodeId,
  getRelationshipEvidenceSourceSymbolId,
  getRelationshipEvidenceTargetNodeId,
  getRelationshipEvidenceTargetSymbolId,
  materializeRelationshipTargetPath,
} from '../../../analysis/relationshipEvidence';

function escapeCypherString(value: string): string {
  return JSON.stringify(value);
}

function createCypherStringProperty(key: string, value: string): string {
  return `${key}: ${escapeCypherString(value)}`;
}

export function createRelationEndpointProperties(
  filePath: string,
  relation: IAnalysisRelationshipEvidence,
  workspaceRoot: string,
): string[] {
  return [
    createCypherStringProperty('fromFilePath', getRelationshipEvidenceSourceFilePath(relation, filePath)),
    createCypherStringProperty('toFilePath', materializeRelationshipTargetPath(relation.target, workspaceRoot) ?? ''),
    createCypherStringProperty('fromNodeId', getRelationshipEvidenceSourceNodeId(relation) ?? ''),
    createCypherStringProperty('toNodeId', getRelationshipEvidenceTargetNodeId(relation) ?? ''),
    createCypherStringProperty('fromSymbolId', getRelationshipEvidenceSourceSymbolId(relation) ?? ''),
    createCypherStringProperty('toSymbolId', getRelationshipEvidenceTargetSymbolId(relation) ?? ''),
  ];
}
