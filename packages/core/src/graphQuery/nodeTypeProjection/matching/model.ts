import type { IGraphData } from '../../../graph/contracts';
import type { IGraphNodeTypeDefinition } from '../../../graphControls/contracts';
import { CORE_GRAPH_NODE_TYPES } from '../../../graphControls/defaults/definitions';
import { getNodeType } from '../../../visibleGraph/model';
import { symbolDefinitionHasMatcher } from '../../../visibleGraph/scopeMatch';
import { symbolMatchesScopedDefinition } from '../../../visibleGraph/scopeSymbolMatch';

function isDefinitionAtOrBelow(
  definition: IGraphNodeTypeDefinition,
  requestedType: string,
  nodeTypeById: ReadonlyMap<string, IGraphNodeTypeDefinition>,
): boolean {
  let current: IGraphNodeTypeDefinition | undefined = definition;
  while (current) {
    if (current.id === requestedType) return true;
    current = current.parentId ? nodeTypeById.get(current.parentId) : undefined;
  }
  return false;
}

function nodeMatchesDescendantDefinition(
  node: IGraphData['nodes'][number],
  requestedType: string,
  nodeTypes: readonly IGraphNodeTypeDefinition[],
  nodeTypeById: ReadonlyMap<string, IGraphNodeTypeDefinition>,
): boolean {
  return nodeTypes.some(definition => (
    definition.id !== requestedType
    && isDefinitionAtOrBelow(definition, requestedType, nodeTypeById)
    && symbolDefinitionHasMatcher(definition)
    && symbolMatchesScopedDefinition(node, definition)
  ));
}

function nodeMatchesRequestedDefinition(
  node: IGraphData['nodes'][number],
  requestedType: string,
  nodeTypeById: ReadonlyMap<string, IGraphNodeTypeDefinition>,
): boolean {
  const definition = nodeTypeById.get(requestedType);
  return Boolean(
    definition
    && symbolDefinitionHasMatcher(definition)
    && symbolMatchesScopedDefinition(node, definition),
  );
}

export function nodeMatchesProjectedNodeTypes(
  node: IGraphData['nodes'][number],
  projectedNodeTypes: readonly string[],
  pluginNodeTypes: readonly IGraphNodeTypeDefinition[] = [],
): boolean {
  const nodeTypes = [...CORE_GRAPH_NODE_TYPES, ...pluginNodeTypes];
  const nodeTypeById = new Map(nodeTypes.map(definition => [definition.id, definition]));
  if (projectedNodeTypes.includes(getNodeType(node))) return true;
  if (!node.symbol) return false;
  if (projectedNodeTypes.includes('symbol')) return true;

  return projectedNodeTypes.some(requestedType => (
    nodeMatchesDescendantDefinition(node, requestedType, nodeTypes, nodeTypeById)
    || nodeMatchesRequestedDefinition(node, requestedType, nodeTypeById)
  ));
}
