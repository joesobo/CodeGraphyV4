import {
  getBackgroundClickCommand,
  getLinkClickCommand,
  getNodeClickCommand,
} from '../../interaction/model';
import type { FGLink, FGNode } from '../../model/build';
import type { GraphCursorStyle } from '../../support/dom';
import type { GraphInteractionHandlersDependencies } from '../handlers';

const NODE_DOUBLE_CLICK_THRESHOLD_MS = 450;

export interface ClickHandlers {
  handleBackgroundClick(this: void, event?: MouseEvent): void;
  handleLinkClick(this: void, link: FGLink, event: MouseEvent): void;
  handleNodeClick(this: void, node: FGNode, event: MouseEvent): void;
}

export interface ClickHandlerCallbacks {
  applyGraphInteractionEffects(
    this: void,
    effects: ReturnType<typeof getNodeClickCommand>['effects'],
    options?: { event?: MouseEvent; link?: FGLink },
  ): void;
  setGraphCursor(this: void, cursor: GraphCursorStyle): void;
}

function isSuppressedMacControlContextAction(
  event: MouseEvent,
  dependencies: GraphInteractionHandlersDependencies,
): boolean {
  return dependencies.isMacPlatform
    && event.ctrlKey
    && dependencies.isContextMenuSuppressed?.() === true;
}

function stopSuppressedContextClick(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

export function createClickHandlers(
  dependencies: GraphInteractionHandlersDependencies,
  callbacks: ClickHandlerCallbacks,
): ClickHandlers {
  const handleNodeClick = (node: FGNode, event: MouseEvent): void => {
    if (isSuppressedMacControlContextAction(event, dependencies)) {
      stopSuppressedContextClick(event);
      return;
    }

    const command = getNodeClickCommand({
      nodeId: node.id,
      label: node.label,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      clientX: event.clientX,
      clientY: event.clientY,
      isRuntimeNode: !!node.ownerPluginId || !!node.runtimeNodeType,
      isMacPlatform: dependencies.isMacPlatform,
      selectedNodeIds: dependencies.selectedNodesSetRef.current,
      lastClick: dependencies.lastClickRef.current,
      now: Date.now(),
      doubleClickThresholdMs: NODE_DOUBLE_CLICK_THRESHOLD_MS,
    });

    dependencies.lastClickRef.current = command.nextLastClick;
    callbacks.applyGraphInteractionEffects(command.effects, { event });
  };

  const handleBackgroundClick = (event?: MouseEvent): void => {
    callbacks.setGraphCursor('default');

    if (!event) {
      callbacks.applyGraphInteractionEffects(
        getBackgroundClickCommand({
          ctrlKey: false,
          isMacPlatform: false,
        }),
      );
      return;
    }

    if (isSuppressedMacControlContextAction(event, dependencies)) {
      stopSuppressedContextClick(event);
      return;
    }

    callbacks.applyGraphInteractionEffects(
      getBackgroundClickCommand({
        ctrlKey: event.ctrlKey,
        isMacPlatform: dependencies.isMacPlatform,
      }),
      { event },
    );
  };

  const handleLinkClick = (link: FGLink, event: MouseEvent): void => {
    if (isSuppressedMacControlContextAction(event, dependencies)) {
      stopSuppressedContextClick(event);
      return;
    }

    callbacks.applyGraphInteractionEffects(
      getLinkClickCommand({
        ctrlKey: event.ctrlKey,
        isMacPlatform: dependencies.isMacPlatform,
      }),
      { event, link },
    );
  };

  return {
    handleBackgroundClick,
    handleLinkClick,
    handleNodeClick,
  };
}
