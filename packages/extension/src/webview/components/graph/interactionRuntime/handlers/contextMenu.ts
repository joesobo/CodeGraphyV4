import { flushSync } from 'react-dom';
import {
  makeBackgroundContextSelection,
  makeEdgeContextSelection,
  makeNodeContextSelection,
} from '../../contextMenu/selection';
import { getNodeContextMenuSelection } from '../../interaction/model';
import type { FGLink } from '../../model/build';
import { resolveEdgeActionTargetId, resolveLinkEndpointId } from '../../support/linkTargets';
import type { GraphInteractionHandlersDependencies } from '../handlers';

export interface ContextMenuHandlers {
  getBackgroundGraphPosition(this: void, event?: MouseEvent): { x: number; y: number } | undefined;
  openBackgroundContextMenu(this: void, event?: MouseEvent): void;
  openEdgeContextMenu(this: void, link: FGLink, event: MouseEvent): void;
  openNodeContextMenu(this: void, nodeId: string, event: MouseEvent): void;
}

export interface ContextMenuSelectionHandlers {
  setHighlight(this: void, nodeId: string | null): void;
  setSelection(this: void, nodeIds: string[]): void;
}

export interface ContextMenuPointerState {
  clientX: number;
  clientY: number;
  ctrlKey: boolean;
}

export function getContextMenuPointerState(
  event?: MouseEvent,
): ContextMenuPointerState {
  if (!event) {
    return {
      clientX: 0,
      clientY: 0,
      ctrlKey: false,
    };
  }

  return {
    clientX: event.clientX,
    clientY: event.clientY,
    ctrlKey: event.ctrlKey,
  };
}

export function getBackgroundGraphPosition(
  dependencies: GraphInteractionHandlersDependencies,
  event?: MouseEvent,
): { x: number; y: number } | undefined {
  if (!event) return undefined;
  const container = dependencies.containerRef.current;
  const graph = dependencies.fg2dRef.current;
  if (!container || !graph?.screen2GraphCoords) {
    return undefined;
  }

  const rect = container.getBoundingClientRect();
  return graph.screen2GraphCoords(event.clientX - rect.left, event.clientY - rect.top);
}

function openContextMenuFromGraphCallback(
  dependencies: GraphInteractionHandlersDependencies,
  event?: MouseEvent,
): void {
  const container = dependencies.containerRef.current;
  if (!container) return;

  const pointerState = getContextMenuPointerState(event);

  const syntheticContextMenu = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    button: 2,
    buttons: 2,
    clientX: pointerState.clientX,
    clientY: pointerState.clientY,
    ctrlKey: pointerState.ctrlKey,
  });
  container.dispatchEvent(syntheticContextMenu);
}

export function createContextMenuHandlers(
  dependencies: GraphInteractionHandlersDependencies,
  selectionHandlers: ContextMenuSelectionHandlers,
): ContextMenuHandlers {
  const openNodeContextMenuAtPosition = (
    nodeId: string,
    event: MouseEvent,
    graphPosition?: { x: number; y: number },
    scopedToNode = false,
  ): void => {
    const selection = getNodeContextMenuSelection(
      nodeId,
      scopedToNode ? new Set() : dependencies.selectedNodesSetRef.current,
    );

    flushSync(() => {
      selectionHandlers.setHighlight(nodeId);
      if (selection.shouldUpdateSelection) {
        selectionHandlers.setSelection(selection.nodeIds);
      }

      dependencies.setContextSelection(
        makeNodeContextSelection(nodeId, new Set(selection.nodeIds), graphPosition),
      );
    });
    dependencies.lastGraphContextEventRef.current = Date.now();
    openContextMenuFromGraphCallback(dependencies, event);
  };

  const openNodeContextMenu = (nodeId: string, event: MouseEvent): void => {
    openNodeContextMenuAtPosition(nodeId, event);
  };

  const openEdgeContextMenu = (link: FGLink, event: MouseEvent): void => {
    const sourceId =
      resolveLinkEndpointId(link.from)
      ?? resolveLinkEndpointId((link as { source?: unknown }).source);
    const targetId =
      resolveLinkEndpointId(link.to)
      ?? resolveLinkEndpointId((link as { target?: unknown }).target);
    if (!sourceId || !targetId) return;

    const edgeId = resolveEdgeActionTargetId(
      link.id,
      sourceId,
      targetId,
      dependencies.dataRef.current.edges,
    );

    flushSync(() => {
      dependencies.setContextSelection(
        makeEdgeContextSelection(edgeId, sourceId, targetId),
      );
    });
    dependencies.lastGraphContextEventRef.current = Date.now();
    openContextMenuFromGraphCallback(dependencies, event);
  };

  const openBackgroundContextMenu = (event?: MouseEvent): void => {
    const graphPosition = getBackgroundGraphPosition(dependencies, event);

    flushSync(() => {
      dependencies.setContextSelection(makeBackgroundContextSelection(graphPosition));
    });
    dependencies.lastGraphContextEventRef.current = Date.now();
    openContextMenuFromGraphCallback(dependencies, event);
  };

  return {
    getBackgroundGraphPosition: event => getBackgroundGraphPosition(dependencies, event),
    openBackgroundContextMenu,
    openEdgeContextMenu,
    openNodeContextMenu,
  };
}
