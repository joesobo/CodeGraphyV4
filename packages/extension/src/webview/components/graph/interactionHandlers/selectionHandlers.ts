import type { FGNode } from '../../graphModel';
import type { GraphInteractionHandlersDependencies } from '../interactionHandlers';

export interface SelectionHandlers {
  clearSelection(this: void): void;
  selectOnlyNode(this: void, nodeId: string): void;
  setHighlight(this: void, nodeId: string | null): void;
  setSelection(this: void, nodeIds: string[]): void;
}

export function createSelectionHandlers(
  dependencies: GraphInteractionHandlersDependencies,
): SelectionHandlers {
  const setSelection = (nodeIds: string[]): void => {
    dependencies.selectedNodesSetRef.current = new Set(nodeIds);
    dependencies.setSelectedNodes(nodeIds);
  };

  const setHighlight = (nodeId: string | null): void => {
    dependencies.highlightedNodeRef.current = nodeId;

    if (nodeId) {
      const neighbors = new Set<string>();
      for (const link of dependencies.graphDataRef.current.links) {
        const sourceId =
          typeof link.source === 'string' ? link.source : (link.source as FGNode | undefined)?.id;
        const targetId =
          typeof link.target === 'string' ? link.target : (link.target as FGNode | undefined)?.id;

        if (sourceId === nodeId && targetId) neighbors.add(targetId);
        if (targetId === nodeId && sourceId) neighbors.add(sourceId);
      }
      dependencies.highlightedNeighborsRef.current = neighbors;
    } else {
      dependencies.highlightedNeighborsRef.current = new Set();
    }

    if (dependencies.graphMode === '3d') {
      dependencies.setHighlightVersion((previous) => previous + 1);
    }
  };

  const selectOnlyNode = (nodeId: string): void => {
    setHighlight(nodeId);
    setSelection([nodeId]);
  };

  const clearSelection = (): void => {
    setHighlight(null);
    setSelection([]);
  };

  return {
    clearSelection,
    selectOnlyNode,
    setHighlight,
    setSelection,
  };
}
