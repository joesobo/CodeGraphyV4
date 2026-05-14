import type { IAnalysisRelation } from '@codegraphy/plugin-api';
import type { GraphQuerySymbolsConfig } from '../model';

export function hasRelationshipFilters(config: GraphQuerySymbolsConfig): boolean {
  return Boolean(config.relatedFrom || config.relatedTo || config.edgeType);
}

function optionalValueMatches<T>(expected: T | undefined, actual: T | undefined): boolean {
  return expected === undefined || actual === expected;
}

export function relationMatchesConfig(relation: IAnalysisRelation, config: GraphQuerySymbolsConfig): boolean {
  const from = relation.fromNodeId ?? relation.fromFilePath;
  const to = relation.toNodeId ?? relation.toFilePath ?? undefined;

  return optionalValueMatches(config.relatedFrom, from)
    && optionalValueMatches(config.relatedTo, to)
    && optionalValueMatches(config.edgeType, relation.kind);
}
