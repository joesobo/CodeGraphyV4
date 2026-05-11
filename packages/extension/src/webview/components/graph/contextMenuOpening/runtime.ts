import type {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  SetStateAction,
} from 'react';
import type { GraphContextActionContext } from '../contextActions/context';
import type {
  GraphContextMenuAction,
  GraphContextSelection,
} from '../contextMenu/contracts';
import {
  createGraphContextMenuRuntime,
  type GraphContextMenuRuntimeDependencies,
} from '../contextMenuRuntime/controller';
import type { createGraphInteractionHandlers } from '../interactionRuntime/handlers';
import type { FGLink, FGNode } from '../model/build';
import type { UseGraphStateResult } from '../runtime/use/state';
import { postMessage } from '../../../vscodeApi';

type GraphInteractionHandlersRuntime = ReturnType<typeof createGraphInteractionHandlers>;
type GraphContextMenuRuntime = ReturnType<typeof createGraphContextMenuRuntime>;

export interface GraphContextMenuOpeningRuntime {
  contextMenuRuntime: GraphContextMenuRuntime;
  handleBackgroundRightClick(this: void, event: MouseEvent): void;
  handleContextMenu(this: void, event?: ReactMouseEvent<HTMLDivElement>): void;
  handleLinkRightClick(this: void, link: FGLink, event: MouseEvent): void;
  handleMenuAction(this: void, action: GraphContextMenuAction): void;
  handleMouseDownCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleMouseMoveCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleMouseUpCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleNodeContextMenuById(this: void, nodeId: string, event: MouseEvent): void;
  handleNodeRightClick(this: void, node: FGNode, event: MouseEvent): void;
}

export interface GraphContextMenuOpeningOptions {
  actionContext: GraphContextActionContext;
  fileInfoCacheRef: UseGraphStateResult['fileInfoCacheRef'];
  hoveredNodeRef: MutableRefObject<FGNode | null>;
  interactionHandlers: GraphInteractionHandlersRuntime;
  lastContainerContextMenuEventRef: UseGraphStateResult['lastContainerContextMenuEventRef'];
  lastGraphContextEventRef: UseGraphStateResult['lastGraphContextEventRef'];
  openFilterPatternPrompt?: (patterns: string[]) => void;
  openLegendRulePrompt?: (rule: { pattern: string; color: string; target: 'node' | 'edge' }) => void;
  refs: Pick<
    UseGraphStateResult,
    | 'rightClickFallbackTimerRef'
    | 'rightMouseDownRef'
  >;
  setContextSelection: Dispatch<SetStateAction<GraphContextSelection>>;
  setTooltipData: GraphContextMenuRuntimeDependencies<FGNode>['setTooltipData'];
  stopTooltipTracking: GraphContextMenuRuntimeDependencies<FGNode>['stopTooltipTracking'];
  tooltipTimeoutRef: GraphContextMenuRuntimeDependencies<FGNode>['tooltipTimeoutRef'];
}

function createGraphContextMenuOpeningDependencies({
  fileInfoCacheRef,
  hoveredNodeRef,
  interactionHandlers,
  lastContainerContextMenuEventRef,
  lastGraphContextEventRef,
  openFilterPatternPrompt,
  openLegendRulePrompt,
  refs,
  setContextSelection,
  setTooltipData,
  stopTooltipTracking,
  tooltipTimeoutRef,
}: Omit<GraphContextMenuOpeningOptions, 'actionContext'>): GraphContextMenuRuntimeDependencies<FGNode> {
  return {
    hoveredNodeRef,
    lastContainerContextMenuEventRef,
    lastGraphContextEventRef,
    rightClickFallbackTimerRef: refs.rightClickFallbackTimerRef,
    rightMouseDownRef: refs.rightMouseDownRef,
    tooltipTimeoutRef,
    clearCachedFile: path => {
      fileInfoCacheRef.current.delete(path);
    },
    fitView: interactionHandlers.fitView,
    focusNode: interactionHandlers.focusNodeById,
    openFilterPatternPrompt: openFilterPatternPrompt ?? (() => {}),
    openLegendRulePrompt: openLegendRulePrompt ?? (() => {}),
    openBackgroundContextMenu: interactionHandlers.openBackgroundContextMenu,
    postMessage,
    setContextSelection,
    setTooltipData,
    stopTooltipTracking,
  };
}

function createGraphContextMenuOpeningHandlers(
  contextMenuRuntime: GraphContextMenuRuntime,
  interactionHandlers: GraphInteractionHandlersRuntime,
  actionContext: GraphContextActionContext,
  refs: GraphContextMenuOpeningOptions['refs'],
): Omit<GraphContextMenuOpeningRuntime, 'contextMenuRuntime'> {
  function clearRightClickBackgroundFallback(): void {
    contextMenuRuntime.clearRightClickFallbackTimer();
    refs.rightMouseDownRef.current = null;
  }

  return {
    handleBackgroundRightClick: event => {
      interactionHandlers.openBackgroundContextMenu(event);
    },
    handleContextMenu: (event) => {
      contextMenuRuntime.handleContextMenu(
        event ? interactionHandlers.getBackgroundGraphPosition(event.nativeEvent) : undefined,
      );
    },
    handleLinkRightClick: (link, event) => {
      interactionHandlers.openEdgeContextMenu(link, event);
    },
    handleMenuAction: action => {
      contextMenuRuntime.handleMenuAction(action, actionContext);
    },
    handleMouseDownCapture: event => {
      contextMenuRuntime.handleMouseDownCapture({
        button: event.button,
        clientX: event.clientX,
        clientY: event.clientY,
        ctrlKey: event.ctrlKey,
      });
    },
    handleMouseMoveCapture: event => {
      contextMenuRuntime.handleMouseMoveCapture({
        clientX: event.clientX,
        clientY: event.clientY,
      });
    },
    handleMouseUpCapture: event => {
      contextMenuRuntime.handleMouseUpCapture({ button: event.button });
    },
    handleNodeContextMenuById: (nodeId, event) => {
      clearRightClickBackgroundFallback();
      interactionHandlers.openNodeContextMenu(nodeId, event);
    },
    handleNodeRightClick: (node, event) => {
      clearRightClickBackgroundFallback();
      interactionHandlers.openNodeContextMenu(node.id, event);
    },
  };
}

export function createGraphContextMenuOpeningRuntime(
  options: GraphContextMenuOpeningOptions,
): GraphContextMenuOpeningRuntime {
  const contextMenuRuntime = createGraphContextMenuRuntime(
    createGraphContextMenuOpeningDependencies(options),
  );

  return {
    contextMenuRuntime,
    ...createGraphContextMenuOpeningHandlers(
      contextMenuRuntime,
      options.interactionHandlers,
      options.actionContext,
      options.refs,
    ),
  };
}
