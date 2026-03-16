import type { FGLink } from '../../graphModel';
import { resolveLinkEndpointId } from '../../graphSupport';
import type { GraphInteractionHandlersDependencies } from '../interactions';

export interface SelectionHandlers {
  clearSelection(this: void): void;
  selectOnlyNode(this: void, nodeId: string): void;
  setHighlight(this: void, nodeId: string | null): void;
  setSelection(this: void, nodeIds: string[]): void;
}

export function resolveSelectionLinkEndpointId(
  endpoint: FGLink['source']  ,
): string | undefined {
  return resolveLinkEndpointId(endpoint) ?? undefined;
}

export function collectHighlightedNeighborIds(
  links: Array<Pick<FGLink, 'source' | 'target'>>,
  nodeId: string,
): Set<string> {
  const neighbors = new Set<string>();

  for (const link of links) {
    const sourceId = resolveSelectionLinkEndpointId(link.source);
    const targetId = resolveSelectionLinkEndpointId(link.target);

    if (sourceId === nodeId && targetId) neighbors.add(targetId);
    if (targetId === nodeId && sourceId) neighbors.add(sourceId);
  }

  return neighbors;
}

export function incrementHighlightVersion(previous: number): number {
  return previous + 1;
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

    if (nodeId === null) {
      dependencies.highlightedNeighborsRef.current = new Set();
    } else {
      dependencies.highlightedNeighborsRef.current = collectHighlightedNeighborIds(
        dependencies.graphDataRef.current.links,
        nodeId,
      );
    }

    if (dependencies.graphMode === '3d') {
      dependencies.setHighlightVersion(incrementHighlightVersion);
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
