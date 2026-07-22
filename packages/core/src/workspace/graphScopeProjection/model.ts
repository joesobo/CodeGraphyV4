import { CORE_GRAPH_NODE_TYPES } from '../../graphControls/defaults/definitions';
import { isPluginScopedGraphNodeType } from '../../graphScope/defaults';

const NODE_DEFINITION_BY_ID = new Map(
  CORE_GRAPH_NODE_TYPES.map(definition => [definition.id, definition]),
);

function isAtOrBelow(nodeType: string, requestedType: string): boolean {
  if (
    requestedType === 'symbol'
    && (nodeType.startsWith('symbol:') || nodeType.includes(':symbol'))
  ) return true;
  let current = NODE_DEFINITION_BY_ID.get(nodeType);
  while (current) {
    if (current.id === requestedType) return true;
    current = current.parentId ? NODE_DEFINITION_BY_ID.get(current.parentId) : undefined;
  }
  return false;
}

export function resolveProjectedGraphNodeTypes(nodeTypes: readonly string[]): string[] {
  const requestedTypes = new Set(nodeTypes);
  const requestedKinds = new Set<string>();
  for (const definition of CORE_GRAPH_NODE_TYPES) {
    if (!requestedTypes.has(definition.id) || isPluginScopedGraphNodeType(definition.id)) continue;
    for (const kind of definition.matchSymbolKinds ?? []) requestedKinds.add(kind);
  }
  const projectedTypes = new Set(nodeTypes);

  for (const definition of CORE_GRAPH_NODE_TYPES) {
    if (nodeTypes.some(nodeType => isAtOrBelow(definition.id, nodeType))) {
      projectedTypes.add(definition.id);
    }
  }

  for (const definition of CORE_GRAPH_NODE_TYPES) {
    if (
      !isPluginScopedGraphNodeType(definition.id)
      && definition.matchSymbolKinds?.some(kind => requestedKinds.has(kind))
    ) projectedTypes.add(definition.id);
  }

  for (const nodeType of projectedTypes) {
    let parentId = NODE_DEFINITION_BY_ID.get(nodeType)?.parentId;
    while (parentId) {
      projectedTypes.add(parentId);
      parentId = NODE_DEFINITION_BY_ID.get(parentId)!.parentId;
    }
  }

  return [...projectedTypes];
}
