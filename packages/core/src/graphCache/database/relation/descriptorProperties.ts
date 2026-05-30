import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';
import {
  getRelationshipEvidenceSpecifier,
  materializeRelationshipTargetPath,
} from '../../../analysis/relationshipEvidence';

function escapeCypherString(value: string): string {
  return JSON.stringify(value);
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function createCypherStringProperty(key: string, value: string): string {
  return `${key}: ${escapeCypherString(value)}`;
}

export function createRelationDescriptorProperties(
  relation: IAnalysisRelationshipEvidence,
  workspaceRoot: string,
): string[] {
  return [
    createCypherStringProperty('pluginId', relation.pluginId ?? ''),
    createCypherStringProperty('specifier', getRelationshipEvidenceSpecifier(relation)),
    createCypherStringProperty('relationType', relation.timing ?? ''),
    createCypherStringProperty('variant', relation.variant ?? ''),
    createCypherStringProperty('resolvedPath', materializeRelationshipTargetPath(relation.target, workspaceRoot) ?? ''),
    createCypherStringProperty('metadataJson', serializeJson(relation.metadata)),
  ];
}
