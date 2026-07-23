import { CORE_GRAPH_NODE_TYPES } from '../../graphControls/defaults/definitions';
import type { IGraphNodeTypeDefinition } from '../../graphControls/contracts';
import { isPluginScopedGraphNodeType } from '../../graphScope/defaults';

function isAtOrBelow(
  nodeType: string,
  requestedType: string,
  nodeTypeById: ReadonlyMap<string, IGraphNodeTypeDefinition>,
): boolean {
  if (
    requestedType === 'symbol'
    && (nodeType.startsWith('symbol:') || nodeType.includes(':symbol'))
  ) return true;
  let current = nodeTypeById.get(nodeType);
  while (current) {
    if (current.id === requestedType) return true;
    current = current.parentId ? nodeTypeById.get(current.parentId) : undefined;
  }
  return false;
}

export function resolveProjectedGraphNodeTypes(
  nodeTypes: readonly string[],
  pluginNodeTypes: readonly IGraphNodeTypeDefinition[] = [],
): string[] {
  const definitions = [...CORE_GRAPH_NODE_TYPES, ...pluginNodeTypes];
  const nodeTypeById = new Map(definitions.map(definition => [definition.id, definition]));
  const requestedTypes = new Set(nodeTypes);
  const requestedKinds = new Set<string>();
  for (const definition of definitions) {
    if (!requestedTypes.has(definition.id) || isPluginScopedGraphNodeType(definition.id)) continue;
    for (const kind of definition.matchSymbolKinds ?? []) requestedKinds.add(kind);
  }
  const projectedTypes = new Set(nodeTypes);

  for (const definition of definitions) {
    if (nodeTypes.some(nodeType => isAtOrBelow(definition.id, nodeType, nodeTypeById))) {
      projectedTypes.add(definition.id);
    }
  }

  for (const definition of definitions) {
    if (
      !isPluginScopedGraphNodeType(definition.id)
      && definition.matchSymbolKinds?.some(kind => requestedKinds.has(kind))
    ) projectedTypes.add(definition.id);
  }

  for (const nodeType of projectedTypes) {
    let parentId = nodeTypeById.get(nodeType)?.parentId;
    while (parentId) {
      projectedTypes.add(parentId);
      parentId = nodeTypeById.get(parentId)?.parentId;
    }
  }

  return [...projectedTypes];
}
