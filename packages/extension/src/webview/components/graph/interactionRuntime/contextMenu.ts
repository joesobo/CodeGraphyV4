import {
  makeBackgroundContextSelection,
  makeEdgeContextSelection,
  makeNodeContextSelection,
} from '../contextMenu/selection';
import { getNodeContextMenuSelection } from '../interaction/model';
import type { FGLink } from '../model/build';
import { resolveEdgeActionTargetId, resolveLinkEndpointId } from '../support/linkTargets';
import type { GraphInteractionHandlersDependencies } from './handlers';

export interface ContextMenuHandlers {
  openBackgroundContextMenu(this: void, event: MouseEvent): void;
  openEdgeContextMenu(this: void, link: FGLink, event: MouseEvent): void;
  openNodeContextMenu(this: void, nodeId: string, event: MouseEvent): void;
}

function openContextMenuFromGraphCallback(
  dependencies: GraphInteractionHandlersDependencies,
  event?: MouseEvent,
): void {
  const container = dependencies.containerRef.current;
  if (!container) return;

  const pointerState = event
    ? {
        clientX: event.clientX,
        clientY: event.clientY,
        ctrlKey: event.ctrlKey,
      }
    : {
        clientX: 0,
        clientY: 0,
        ctrlKey: false,
      };

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
  setSelection: (nodeIds: string[]) => void,
): ContextMenuHandlers {
  const openNodeContextMenu = (nodeId: string, event: MouseEvent): void => {
    const selection = getNodeContextMenuSelection(
      nodeId,
      dependencies.selectedNodesSetRef.current,
    );

    if (selection.shouldUpdateSelection) {
      setSelection(selection.nodeIds);
    }

    dependencies.setContextSelection(
      makeNodeContextSelection(nodeId, new Set(selection.nodeIds)),
    );
    dependencies.lastGraphContextEventRef.current = Date.now();
    openContextMenuFromGraphCallback(dependencies, event);
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

    dependencies.setContextSelection(
      makeEdgeContextSelection(edgeId, sourceId, targetId),
    );
    dependencies.lastGraphContextEventRef.current = Date.now();
    openContextMenuFromGraphCallback(dependencies, event);
  };

  const openBackgroundContextMenu = (event: MouseEvent): void => {
    dependencies.setContextSelection(makeBackgroundContextSelection());
    dependencies.lastGraphContextEventRef.current = Date.now();
    openContextMenuFromGraphCallback(dependencies, event);
  };

  return {
    openBackgroundContextMenu,
    openEdgeContextMenu,
    openNodeContextMenu,
  };
}
