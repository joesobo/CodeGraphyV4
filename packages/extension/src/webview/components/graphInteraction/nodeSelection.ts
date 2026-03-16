import type { GraphNodeContextMenuSelection } from '../graphInteractionModel';

export function toggleNodeSelection(
  nodeId: string,
  selectedNodeIds: Iterable<string>,
): string[] {
  const nextSelection = new Set(selectedNodeIds);

  if (nextSelection.has(nodeId)) {
    nextSelection.delete(nodeId);
  } else {
    nextSelection.add(nodeId);
  }

  return [...nextSelection];
}

export function getNodeContextMenuSelection(
  nodeId: string,
  selectedNodeIds: Iterable<string>,
): GraphNodeContextMenuSelection {
  const currentSelection = new Set(selectedNodeIds);

  if (currentSelection.has(nodeId)) {
    return {
      nodeIds: [...currentSelection],
      shouldUpdateSelection: false,
    };
  }

  return {
    nodeIds: [nodeId],
    shouldUpdateSelection: true,
  };
}
