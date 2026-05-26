import { flushSync } from 'react-dom';
import {
  makeBackgroundContextSelection,
  makeEdgeContextSelection,
  makeNodeContextSelection,
} from '../../contextMenu/selection';
import { findDeepestGraphLayoutSectionAtWorldPoint } from '../../../../../shared/settings/graphLayout';
import { getNodeContextMenuSelection } from '../../interaction/model';
import type { FGLink } from '../../model/build';
import { resolveEdgeActionTargetId, resolveLinkEndpointId } from '../../support/linkTargets';
import type { GraphInteractionHandlersDependencies } from '../handlers';

export interface ContextMenuHandlers {
  getBackgroundGraphPosition(this: void, event: MouseEvent): { x: number; y: number } | undefined;
  openBackgroundContextMenu(this: void, event: MouseEvent): void;
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
  event: MouseEvent,
): { x: number; y: number } | undefined {
  if (dependencies.graphMode !== '2d') {
    return undefined;
  }

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

function markGraphContextEvent(dependencies: GraphInteractionHandlersDependencies): void {
  dependencies.lastGraphContextEventRef.current = Date.now();
}

function openNodeContextMenuAtPosition(
  dependencies: GraphInteractionHandlersDependencies,
  selectionHandlers: ContextMenuSelectionHandlers,
  nodeId: string,
  event: MouseEvent,
  graphPosition?: { x: number; y: number },
  scopedToNode = false,
): void {
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
  markGraphContextEvent(dependencies);
  openContextMenuFromGraphCallback(dependencies, event);
}

function resolveContextMenuEdgeEndpointIds(link: FGLink): { sourceId: string; targetId: string } | undefined {
  const sourceId =
    resolveLinkEndpointId(link.from)
    ?? resolveLinkEndpointId((link as { source?: unknown }).source);
  const targetId =
    resolveLinkEndpointId(link.to)
    ?? resolveLinkEndpointId((link as { target?: unknown }).target);

  return sourceId && targetId ? { sourceId, targetId } : undefined;
}

function openEdgeContextMenuAtPosition(
  dependencies: GraphInteractionHandlersDependencies,
  link: FGLink,
  event: MouseEvent,
): void {
  const endpoints = resolveContextMenuEdgeEndpointIds(link);
  if (!endpoints) return;

  const edgeId = resolveEdgeActionTargetId(
    link.id,
    endpoints.sourceId,
    endpoints.targetId,
    dependencies.dataRef.current.edges,
  );

  flushSync(() => {
    dependencies.setContextSelection(
      makeEdgeContextSelection(edgeId, endpoints.sourceId, endpoints.targetId),
    );
  });
  markGraphContextEvent(dependencies);
  openContextMenuFromGraphCallback(dependencies, event);
}

function findBackgroundSectionId(
  dependencies: GraphInteractionHandlersDependencies,
  graphPosition: { x: number; y: number } | undefined,
): string | null {
  return dependencies.graphMode === '2d' && dependencies.graphLayout && graphPosition
    ? findDeepestGraphLayoutSectionAtWorldPoint(dependencies.graphLayout, graphPosition)
    : null;
}

function openPlainBackgroundContextMenu(
  dependencies: GraphInteractionHandlersDependencies,
  event: MouseEvent,
  graphPosition: { x: number; y: number } | undefined,
): void {
  flushSync(() => {
    dependencies.setContextSelection(makeBackgroundContextSelection(graphPosition));
  });
  markGraphContextEvent(dependencies);
  openContextMenuFromGraphCallback(dependencies, event);
}

export function createContextMenuHandlers(
  dependencies: GraphInteractionHandlersDependencies,
  selectionHandlers: ContextMenuSelectionHandlers,
): ContextMenuHandlers {
  const openNodeContextMenu = (nodeId: string, event: MouseEvent): void => {
    openNodeContextMenuAtPosition(dependencies, selectionHandlers, nodeId, event);
  };

  const openEdgeContextMenu = (link: FGLink, event: MouseEvent): void => {
    openEdgeContextMenuAtPosition(dependencies, link, event);
  };

  const openBackgroundContextMenu = (event: MouseEvent): void => {
    const graphPosition = getBackgroundGraphPosition(dependencies, event);
    const sectionId = findBackgroundSectionId(dependencies, graphPosition);

    if (sectionId) {
      openNodeContextMenuAtPosition(dependencies, selectionHandlers, sectionId, event, graphPosition, true);
      return;
    }

    openPlainBackgroundContextMenu(dependencies, event, graphPosition);
  };

  return {
    getBackgroundGraphPosition: event => getBackgroundGraphPosition(dependencies, event),
    openBackgroundContextMenu,
    openEdgeContextMenu,
    openNodeContextMenu,
  };
}
