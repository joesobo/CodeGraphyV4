import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';
import {
  getRelationshipEvidenceSourceFilePath,
  getRelationshipEvidenceSourceNodeId,
  getRelationshipEvidenceTargetNodeId,
  materializeRelationshipTargetPath,
} from '../../analysis/relationshipEvidence';
import type { GraphQuerySymbolsConfig } from '../model';

export function hasRelationshipFilters(config: GraphQuerySymbolsConfig): boolean {
  return Boolean(config.relatedFrom || config.relatedTo || config.edgeType);
}

function optionalValueMatches<T>(expected: T | undefined, actual: T | undefined): boolean {
  return expected === undefined || actual === expected;
}

export function relationMatchesConfig(relation: IAnalysisRelationshipEvidence, config: GraphQuerySymbolsConfig): boolean {
  const from = getRelationshipEvidenceSourceNodeId(relation) ?? getRelationshipEvidenceSourceFilePath(relation, '');
  const to = getRelationshipEvidenceTargetNodeId(relation)
    ?? materializeRelationshipTargetPath(relation.target, '')
    ?? undefined;

  return optionalValueMatches(config.relatedFrom, from)
    && optionalValueMatches(config.relatedTo, to)
    && optionalValueMatches(config.edgeType, relation.edgeType);
}
