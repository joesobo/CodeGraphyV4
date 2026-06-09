import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { GraphQueryRelationshipProvenance } from '../model';

export function createProvenance(relation: IAnalysisRelation): GraphQueryRelationshipProvenance | undefined {
  if (!relation.pluginId) {
    return undefined;
  }

  return {
    pluginId: relation.pluginId,
    sourceId: relation.sourceId,
  };
}
