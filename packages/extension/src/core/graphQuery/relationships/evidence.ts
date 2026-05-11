import type { IAnalysisRelation, IAnalysisSymbol } from '../../plugins/types/contracts';
import type { GraphQueryData } from '../data';
import type { GraphQueryConnectionConfig } from '../model';
import { deriveScopedGraphQueryData } from '../visible';
import type { RelationshipEvidence } from './model';
import { createProvenance, createRelationshipSymbol } from './symbols';
import { edgeKey } from './visibility';

function relationFrom(relation: IAnalysisRelation): string {
  return relation.fromNodeId ?? relation.fromFilePath;
}

function relationTo(relation: IAnalysisRelation): string | undefined {
  return relation.toNodeId ?? relation.toFilePath ?? undefined;
}

export function createRelationEvidence(
  relations: readonly IAnalysisRelation[] | undefined,
  symbolById: ReadonlyMap<string, IAnalysisSymbol>,
  visibleEdgeKeys: ReadonlySet<string>,
): RelationshipEvidence[] {
  return (relations ?? []).flatMap((relation) => {
    const to = relationTo(relation);
    if (!to) {
      return [];
    }

    const evidence = {
      from: relationFrom(relation),
      to,
      edgeType: relation.kind,
    };

    if (!visibleEdgeKeys.has(edgeKey({ ...evidence, kind: evidence.edgeType }))) {
      return [];
    }

    return [{
      ...evidence,
      provenance: createProvenance(relation),
      symbol: createRelationshipSymbol(relation.kind, relation, symbolById),
    }];
  });
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
