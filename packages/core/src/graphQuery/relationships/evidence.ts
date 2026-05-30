import type { IAnalysisRelationshipEvidence, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import {
  getRelationshipEvidenceSourceFilePath,
  getRelationshipEvidenceSourceNodeId,
  getRelationshipEvidenceTargetNodeId,
  materializeRelationshipTargetPath,
} from '../../analysis/relationshipEvidence';
import type { GraphQueryData } from '../data';
import type { GraphQueryConnectionConfig } from '../model';
import { deriveScopedGraphQueryData } from '../visible';
import type { RelationshipEvidence } from './model';
import { createProvenance, createRelationshipSymbol } from './symbols';
import { edgeKey } from './visibility';

function relationFrom(relation: IAnalysisRelationshipEvidence): string {
  return getRelationshipEvidenceSourceNodeId(relation) ?? getRelationshipEvidenceSourceFilePath(relation, '');
}

function relationTo(relation: IAnalysisRelationshipEvidence): string | undefined {
  return getRelationshipEvidenceTargetNodeId(relation)
    ?? materializeRelationshipTargetPath(relation.target, '')
    ?? undefined;
}

export function createRelationEvidence(
  relations: readonly IAnalysisRelationshipEvidence[] | undefined,
  symbolById: ReadonlyMap<string, IAnalysisSymbol>,
  visibleEdgeKeys: ReadonlySet<string>,
): RelationshipEvidence[] {
  if (!relations?.length) {
    return [];
  }

  const evidenceItems: RelationshipEvidence[] = [];
  for (const relation of relations) {
    const to = relationTo(relation);
    if (!to) {
      continue;
    }

    const evidence = {
      from: relationFrom(relation),
      to,
      edgeType: relation.edgeType,
    };

    if (!visibleEdgeKeys.has(edgeKey({ ...evidence, kind: evidence.edgeType }))) {
      continue;
    }

    evidenceItems.push({
      ...evidence,
      provenance: createProvenance(relation),
      symbol: createRelationshipSymbol(relation.edgeType, relation, symbolById),
    });
  }

  return evidenceItems;
}

export function createStructuralEvidence(
  data: GraphQueryData,
  config: GraphQueryConnectionConfig,
  visibleEdgeKeys: ReadonlySet<string>,
): RelationshipEvidence[] {
  const scopedGraph = deriveScopedGraphQueryData(data.graphData, config);
  return scopedGraph.edges
    .filter((edge) => edge.kind === 'nests')
    .filter((edge) => visibleEdgeKeys.has(edgeKey(edge)))
    .map((edge) => ({
      from: edge.from,
      to: edge.to,
      edgeType: edge.kind,
    }));
}
