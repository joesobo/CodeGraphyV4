import { requiresSymbolAnalysisCacheTier } from '../analysis/fileAnalysis/cacheTiers';
import { CORE_GRAPH_NODE_TYPES } from '../graphControls/defaults/definitions';

const CORE_SYMBOL_LEAF_NODE_TYPE_IDS = new Set(
  CORE_GRAPH_NODE_TYPES
    .filter(definition => definition.parentId === 'symbol' || definition.parentId === 'variable')
    .map(definition => definition.id),
);

export function shouldProjectSymbolGraph(
  nodeVisibility: Readonly<Record<string, boolean>> | undefined,
): boolean {
  return requiresSymbolAnalysisCacheTier(nodeVisibility ?? {});
}

export function shouldIncludeSymbolEndpointRelations(
  nodeVisibility: Readonly<Record<string, boolean>> | undefined,
): boolean {
  if (!shouldProjectSymbolGraph(nodeVisibility)) return true;
  return !Object.entries(nodeVisibility ?? {}).some(([nodeType, visible]) => (
    visible === true && CORE_SYMBOL_LEAF_NODE_TYPE_IDS.has(nodeType)
  ));
}
