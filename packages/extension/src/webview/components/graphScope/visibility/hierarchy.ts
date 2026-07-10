import type { IGraphNodeTypeDefinition } from '../../../../shared/graphControls/contracts';

export function getParentNodeTypeUpdates(
  nodeTypes: IGraphNodeTypeDefinition[],
  nodeTypeId: string,
): Record<string, boolean> {
  const nodeTypeById = new Map(nodeTypes.map((nodeType) => [nodeType.id, nodeType]));
  const updates: Record<string, boolean> = {};
  let current = nodeTypeById.get(nodeTypeId);

  while (current?.parentId) {
    updates[current.parentId] = true;
    current = nodeTypeById.get(current.parentId);
  }

  return updates;
}
