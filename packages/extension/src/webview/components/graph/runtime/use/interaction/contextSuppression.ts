import {
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { GraphContextMenuOpeningRuntime } from '../../../contextMenuOpening/runtime';
import type { FGLink, FGNode } from '../../../model/build';

const CONTEXT_MENU_SUPPRESSION_MS = 250;

interface ContextMenuSuppressionRuntime {
  isContextMenuSuppressed(this: void): boolean;
  suppressContextMenu(this: void): void;
}

export interface SuppressedContextMenuHandlers {
  handleBackgroundRightClick: GraphContextMenuOpeningRuntime['handleBackgroundRightClick'];
  handleContextMenu(this: void, event?: ReactMouseEvent<HTMLDivElement>): void;
  handleLinkRightClick: GraphContextMenuOpeningRuntime['handleLinkRightClick'];
  handleNodeRightClick: GraphContextMenuOpeningRuntime['handleNodeRightClick'];
}

export function useContextMenuSuppression(): ContextMenuSuppressionRuntime {
  const contextMenuSuppressedUntilRef = useRef(0);

  return useMemo(() => ({
    isContextMenuSuppressed: () => Date.now() < contextMenuSuppressedUntilRef.current,
    suppressContextMenu: () => {
      contextMenuSuppressedUntilRef.current = Date.now() + CONTEXT_MENU_SUPPRESSION_MS;
    },
  }), []);
}

function callContextMenuUnlessSuppressed(
  contextMenuOpeningRuntime: GraphContextMenuOpeningRuntime,
  isContextMenuSuppressed: () => boolean,
  event?: ReactMouseEvent<HTMLDivElement>,
): void {
  if (isContextMenuSuppressed()) {
    event?.preventDefault();
    event?.stopPropagation();
    return;
  }

  contextMenuOpeningRuntime.handleContextMenu();
}

function callBackgroundRightClickUnlessSuppressed(
  contextMenuOpeningRuntime: GraphContextMenuOpeningRuntime,
  isContextMenuSuppressed: () => boolean,
  event: MouseEvent,
): void {
  if (!isContextMenuSuppressed()) {
    contextMenuOpeningRuntime.handleBackgroundRightClick(event);
  }
}

function callLinkRightClickUnlessSuppressed(
  contextMenuOpeningRuntime: GraphContextMenuOpeningRuntime,
  isContextMenuSuppressed: () => boolean,
  link: FGLink,
  event: MouseEvent,
): void {
  if (!isContextMenuSuppressed()) {
    contextMenuOpeningRuntime.handleLinkRightClick(link, event);
  }
}

function callNodeRightClickUnlessSuppressed(
  contextMenuOpeningRuntime: GraphContextMenuOpeningRuntime,
  isContextMenuSuppressed: () => boolean,
  node: FGNode,
  event: MouseEvent,
): void {
  if (!isContextMenuSuppressed()) {
    contextMenuOpeningRuntime.handleNodeRightClick(node, event);
  }
}

export function createSuppressedContextMenuHandlers(
  contextMenuOpeningRuntime: GraphContextMenuOpeningRuntime,
  contextMenuSuppression: Pick<ContextMenuSuppressionRuntime, 'isContextMenuSuppressed'>,
): SuppressedContextMenuHandlers {
  const { isContextMenuSuppressed } = contextMenuSuppression;

  return {
    handleBackgroundRightClick: (event) => callBackgroundRightClickUnlessSuppressed(
      contextMenuOpeningRuntime,
      isContextMenuSuppressed,
      event,
    ),
    handleContextMenu: (event) => callContextMenuUnlessSuppressed(
      contextMenuOpeningRuntime,
      isContextMenuSuppressed,
      event,
    ),
    handleLinkRightClick: (link, event) => callLinkRightClickUnlessSuppressed(
      contextMenuOpeningRuntime,
      isContextMenuSuppressed,
      link,
      event,
    ),
    handleNodeRightClick: (node, event) => callNodeRightClickUnlessSuppressed(
      contextMenuOpeningRuntime,
      isContextMenuSuppressed,
      node,
      event,
    ),
  };
}
