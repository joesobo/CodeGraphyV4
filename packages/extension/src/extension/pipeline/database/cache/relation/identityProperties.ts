import type { IAnalysisRelation } from '../../../../../core/plugins/types/contracts';

function escapeCypherString(value: string): string {
  return JSON.stringify(value);
}

function createCypherStringProperty(key: string, value: string): string {
  return `${key}: ${escapeCypherString(value)}`;
}

function createRelationRowId(
  filePath: string,
  relation: IAnalysisRelation,
  index: number,
): string {
  return [
    filePath,
    relation.kind,
    relation.sourceId,
    relation.fromFilePath,
    relation.toFilePath ?? '',
    relation.fromSymbolId ?? '',
    relation.toSymbolId ?? '',
    relation.specifier ?? '',
    relation.type ?? '',
    relation.variant ?? '',
    String(index),
  ].join('|');
}

export function createRelationIdentityProperties(
  filePath: string,
  relation: IAnalysisRelation,
  relationIndex: number,
): string[] {
  return [
    createCypherStringProperty('relationId', createRelationRowId(filePath, relation, relationIndex)),
    createCypherStringProperty('filePath', filePath),
    createCypherStringProperty('kind', relation.kind),
    createCypherStringProperty('sourceId', relation.sourceId),
  ];
}
