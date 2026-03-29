import {
  getBackgroundClickCommand,
  getLinkClickCommand,
  getNodeClickCommand,
} from '../interaction/model';
import type { FGLink, FGNode } from '../model/build';
import type { GraphCursorStyle } from '../support/dom';
import type { GraphInteractionHandlersDependencies } from './handlers';

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

export function createClickHandlers(
  dependencies: GraphInteractionHandlersDependencies,
  callbacks: ClickHandlerCallbacks,
): ClickHandlers {
  const handleNodeClick = (node: FGNode, event: MouseEvent): void => {
    const command = getNodeClickCommand({
      nodeId: node.id,
      label: node.label,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      clientX: event.clientX,
      clientY: event.clientY,
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

    callbacks.applyGraphInteractionEffects(
      getBackgroundClickCommand({
        ctrlKey: event.ctrlKey,
        isMacPlatform: dependencies.isMacPlatform,
      }),
      { event },
    );
  };

  const handleLinkClick = (link: FGLink, event: MouseEvent): void => {
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
