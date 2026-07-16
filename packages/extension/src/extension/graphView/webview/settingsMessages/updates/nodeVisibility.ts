import { CORE_GRAPH_NODE_TYPES } from '../../../../../shared/graphControls/defaults/nodeTypes';
import { isSymbolDependentNodeType } from './symbolNodeType';

export function getParentNodeTypeUpdates(nodeType: string): Record<string, boolean> {
  const updates: Record<string, boolean> = {};
  let current = CORE_GRAPH_NODE_TYPES.find(definition => definition.id === nodeType);
  const hasKnownParent = Boolean(current?.parentId);

  while (current?.parentId) {
    updates[current.parentId] = true;
    current = CORE_GRAPH_NODE_TYPES.find(definition => definition.id === current?.parentId);
  }

  if (!hasKnownParent && nodeType !== 'variable' && isSymbolDependentNodeType(nodeType)) {
    updates.symbol = true;
  }
  return updates;
}

export function applyNodeVisibilityEntry(
  nodeVisibility: Record<string, boolean>,
  nodeType: string,
  visible: boolean,
): Record<string, boolean> {
  if (!visible) {
    return { ...nodeVisibility, [nodeType]: false };
  }

  return {
    ...nodeVisibility,
    ...(nodeType === 'symbol' ? {} : getParentNodeTypeUpdates(nodeType)),
    [nodeType]: true,
  };
}
