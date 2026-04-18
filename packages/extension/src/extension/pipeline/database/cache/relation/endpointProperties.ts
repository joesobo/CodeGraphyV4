import type { IAnalysisRelation } from '../../../../../core/plugins/types/contracts';

function escapeCypherString(value: string): string {
  return JSON.stringify(value);
}

function createCypherStringProperty(key: string, value: string): string {
  return `${key}: ${escapeCypherString(value)}`;
}

export function createRelationEndpointProperties(relation: IAnalysisRelation): string[] {
  return [
    createCypherStringProperty('fromFilePath', relation.fromFilePath),
    createCypherStringProperty('toFilePath', relation.toFilePath ?? ''),
    createCypherStringProperty('fromNodeId', relation.fromNodeId ?? ''),
    createCypherStringProperty('toNodeId', relation.toNodeId ?? ''),
    createCypherStringProperty('fromSymbolId', relation.fromSymbolId ?? ''),
    createCypherStringProperty('toSymbolId', relation.toSymbolId ?? ''),
  ];
}
