import type { IAnalysisRelation } from '../../../core/plugins/types/contracts';

function escapeCypherString(value: string): string {
  return JSON.stringify(value);
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function createCypherStringProperty(key: string, value: string): string {
  return `${key}: ${escapeCypherString(value)}`;
}

export function createRelationDescriptorProperties(relation: IAnalysisRelation): string[] {
  return [
    createCypherStringProperty('pluginId', relation.pluginId ?? ''),
    createCypherStringProperty('specifier', relation.specifier ?? ''),
    createCypherStringProperty('relationType', relation.type ?? ''),
    createCypherStringProperty('variant', relation.variant ?? ''),
    createCypherStringProperty('resolvedPath', relation.resolvedPath ?? ''),
    createCypherStringProperty('metadataJson', serializeJson(relation.metadata)),
  ];
}
