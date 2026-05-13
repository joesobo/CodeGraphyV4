import type { IAnalysisRelation } from '../../plugins/types/contracts';
import type { GraphQueryRelationshipProvenance } from '../model';

const TREE_SITTER_PLUGIN_ID = 'codegraphy.treesitter';

export function createProvenance(relation: IAnalysisRelation): GraphQueryRelationshipProvenance | undefined {
  if (!relation.pluginId || relation.pluginId === TREE_SITTER_PLUGIN_ID) {
    return undefined;
  }

  return {
    pluginId: relation.pluginId,
    sourceId: relation.sourceId,
  };
}
