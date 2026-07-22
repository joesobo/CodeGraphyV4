import type { IGraphData } from '../../../graph/contracts';
import type { IGraphNodeTypeDefinition } from '../../../graphControls/contracts';
import { CORE_GRAPH_NODE_TYPES } from '../../../graphControls/defaults/definitions';
import { getNodeType } from '../../../visibleGraph/model';
import { symbolDefinitionHasMatcher } from '../../../visibleGraph/scopeMatch';
import { symbolMatchesScopedDefinition } from '../../../visibleGraph/scopeSymbolMatch';

const NODE_TYPE_BY_ID = new Map(
  CORE_GRAPH_NODE_TYPES.map(definition => [definition.id, definition]),
);

function isDefinitionAtOrBelow(
  definition: IGraphNodeTypeDefinition,
  requestedType: string,
): boolean {
  let current: IGraphNodeTypeDefinition | undefined = definition;
  while (current) {
    if (current.id === requestedType) return true;
    current = current.parentId ? NODE_TYPE_BY_ID.get(current.parentId) : undefined;
  }
  return false;
}

function nodeMatchesDescendantDefinition(
  node: IGraphData['nodes'][number],
  requestedType: string,
): boolean {
  return CORE_GRAPH_NODE_TYPES.some(definition => (
    definition.id !== requestedType
    && isDefinitionAtOrBelow(definition, requestedType)
    && symbolDefinitionHasMatcher(definition)
    && symbolMatchesScopedDefinition(node, definition)
  ));
}

function nodeMatchesRequestedDefinition(
  node: IGraphData['nodes'][number],
  requestedType: string,
): boolean {
  const definition = NODE_TYPE_BY_ID.get(requestedType);
  return Boolean(
    definition
    && symbolDefinitionHasMatcher(definition)
    && symbolMatchesScopedDefinition(node, definition),
  );
}

export function nodeMatchesProjectedNodeTypes(
  node: IGraphData['nodes'][number],
  projectedNodeTypes: readonly string[],
): boolean {
  if (projectedNodeTypes.includes(getNodeType(node))) return true;
  if (!node.symbol) return false;
  if (projectedNodeTypes.includes('symbol')) return true;

  return projectedNodeTypes.some(requestedType => (
    nodeMatchesDescendantDefinition(node, requestedType)
    || nodeMatchesRequestedDefinition(node, requestedType)
  ));
}
