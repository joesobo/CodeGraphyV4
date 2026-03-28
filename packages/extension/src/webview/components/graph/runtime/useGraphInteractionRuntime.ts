import {
  useEffect,
  useMemo,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type { IGraphData } from '../../../../shared/contracts';
import type { GraphContextMenuAction, GraphContextSelection } from '../../graphContextMenu/types';
import {
  createGraphContextMenuRuntime,
  type GraphContextMenuRuntimeDependencies,
} from '../contextMenuRuntime';
import { createGraphInteractionHandlers } from '../interactions';
import type { GraphCursorStyle } from '../../graphSupport/dom';
import { applyCursorToGraphSurface } from '../../graphSupport/dom';
import {
  useGraphTooltip,
  type GraphTooltipInteractionDependencies,
} from './useGraphTooltip';
import type { FGLink, FGNode } from '../../graphModel';
import type { UseGraphStateResult } from './useGraphState';
import type { WebviewPluginHost } from '../../../pluginHost/webviewPluginHost';
import { postMessage } from '../../../vscodeApi';

export interface UseGraphInteractionRuntimeOptions {
  dataRef: MutableRefObject<IGraphData>;
  fileInfoCacheRef: UseGraphStateResult['fileInfoCacheRef'];
  graphContextSelection: GraphContextSelection;
  graphCursorRef: MutableRefObject<GraphCursorStyle>;
  graphDataRef: UseGraphStateResult['graphDataRef'];
  graphMode: '2d' | '3d';
  highlightedNeighborsRef: UseGraphStateResult['highlightedNeighborsRef'];
  highlightedNodeRef: UseGraphStateResult['highlightedNodeRef'];
  isMacPlatform: boolean;
  lastClickRef: UseGraphStateResult['lastClickRef'];
  lastContainerContextMenuEventRef: UseGraphStateResult['lastContainerContextMenuEventRef'];
  lastGraphContextEventRef: UseGraphStateResult['lastGraphContextEventRef'];
  pluginHost?: WebviewPluginHost;
  refs: Pick<
    UseGraphStateResult,
    | 'containerRef'
    | 'fg2dRef'
    | 'fg3dRef'
    | 'rightClickFallbackTimerRef'
    | 'rightMouseDownRef'
    | 'selectedNodesSetRef'
  >;
  setContextSelection: Dispatch<SetStateAction<GraphContextSelection>>;
  setHighlightVersion: Dispatch<SetStateAction<number>>;
  setSelectedNodes: Dispatch<SetStateAction<string[]>>;
}

export interface UseGraphInteractionRuntimeResult {
  contextMenuRuntime: ReturnType<typeof createGraphContextMenuRuntime>;
  handleBackgroundRightClick(this: void, event: MouseEvent): void;
  handleContextMenu(this: void): void;
  handleEngineStop(this: void): void;
  handleLinkRightClick(this: void, link: FGLink, event: MouseEvent): void;
  handleMenuAction(this: void, action: GraphContextMenuAction): void;
  handleMouseDownCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleMouseLeave(this: void): void;
  handleMouseMoveCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleMouseUpCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleNodeHover(this: void, node: FGNode | null): void;
  handleNodeRightClick(this: void, node: FGNode, event: MouseEvent): void;
  hoveredNodeRef: MutableRefObject<FGNode | null>;
  interactionHandlers: ReturnType<typeof createGraphInteractionHandlers>;
  setTooltipData: ReturnType<typeof useGraphTooltip>['setTooltipData'];
  stopTooltipTracking: ReturnType<typeof useGraphTooltip>['stopTooltipTracking'];
  tooltipData: ReturnType<typeof useGraphTooltip>['tooltipData'];
  tooltipTimeoutRef: ReturnType<typeof useGraphTooltip>['tooltipTimeoutRef'];
}

type GraphInteractionHandlersRuntime = ReturnType<typeof createGraphInteractionHandlers>;
type GraphContextMenuRuntime = ReturnType<typeof createGraphContextMenuRuntime>;

interface BuildContextMenuRuntimeDependenciesOptions {
  fileInfoCacheRef: UseGraphStateResult['fileInfoCacheRef'];
  hoveredNodeRef: MutableRefObject<FGNode | null>;
  interactionHandlers: GraphInteractionHandlersRuntime;
  lastContainerContextMenuEventRef: UseGraphStateResult['lastContainerContextMenuEventRef'];
  lastGraphContextEventRef: UseGraphStateResult['lastGraphContextEventRef'];
  refs: UseGraphInteractionRuntimeOptions['refs'];
  setContextSelection: Dispatch<SetStateAction<GraphContextSelection>>;
  setTooltipData: ReturnType<typeof useGraphTooltip>['setTooltipData'];
  stopTooltipTracking: ReturnType<typeof useGraphTooltip>['stopTooltipTracking'];
  tooltipTimeoutRef: ReturnType<typeof useGraphTooltip>['tooltipTimeoutRef'];
}

function buildTooltipInteractionHandlers(
  interactionHandlers: GraphInteractionHandlersRuntime,
): GraphTooltipInteractionDependencies {
  return {
    sendGraphInteraction: interactionHandlers.sendGraphInteraction,
    setGraphCursor: interactionHandlers.setGraphCursor,
  };
}

function buildContextMenuRuntimeDependencies({
  fileInfoCacheRef,
  hoveredNodeRef,
  interactionHandlers,
  lastContainerContextMenuEventRef,
  lastGraphContextEventRef,
  refs,
  setContextSelection,
  setTooltipData,
  stopTooltipTracking,
  tooltipTimeoutRef,
}: BuildContextMenuRuntimeDependenciesOptions): GraphContextMenuRuntimeDependencies<FGNode> {
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
    openBackgroundContextMenu: interactionHandlers.openBackgroundContextMenu,
    postMessage,
    setContextSelection,
    setTooltipData,
    stopTooltipTracking,
  };
}

function buildContextMenuRuntimeHandlers(
  contextMenuRuntime: GraphContextMenuRuntime,
  targetPaths: string[],
): Pick<
  UseGraphInteractionRuntimeResult,
  | 'handleContextMenu'
  | 'handleMenuAction'
  | 'handleMouseDownCapture'
  | 'handleMouseMoveCapture'
  | 'handleMouseUpCapture'
> {
  return {
    handleContextMenu: () => {
      contextMenuRuntime.handleContextMenu();
    },
    handleMenuAction: action => {
      contextMenuRuntime.handleMenuAction(action, targetPaths);
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
  };
}

function buildInteractionRuntimeHandlers(
  interactionHandlers: GraphInteractionHandlersRuntime,
): Pick<
  UseGraphInteractionRuntimeResult,
  | 'handleBackgroundRightClick'
  | 'handleLinkRightClick'
  | 'handleNodeRightClick'
> {
  return {
    handleBackgroundRightClick: event => {
      interactionHandlers.openBackgroundContextMenu(event);
    },
    handleLinkRightClick: (link, event) => {
      interactionHandlers.openEdgeContextMenu(link, event);
    },
    handleNodeRightClick: (node, event) => {
      interactionHandlers.openNodeContextMenu(node.id, event);
    },
  };
}

function handleGraphEngineStop(): void {
  postMessage({ type: 'PHYSICS_STABILIZED' });
}

export function useGraphInteractionRuntime({
  dataRef,
  fileInfoCacheRef,
  graphContextSelection,
  graphCursorRef,
  graphDataRef,
  graphMode,
  highlightedNeighborsRef,
  highlightedNodeRef,
  isMacPlatform,
  lastClickRef,
  lastContainerContextMenuEventRef,
  lastGraphContextEventRef,
  pluginHost,
  refs,
  setContextSelection,
  setHighlightVersion,
  setSelectedNodes,
}: UseGraphInteractionRuntimeOptions): UseGraphInteractionRuntimeResult {
  const interactionHandlers = useMemo(
    () => createGraphInteractionHandlers({
      containerRef: refs.containerRef,
      dataRef,
      fg2dRef: refs.fg2dRef,
      fg3dRef: refs.fg3dRef,
      fileInfoCacheRef,
      graphCursorRef,
      graphDataRef,
      graphMode,
      highlightedNeighborsRef,
      highlightedNodeRef,
      isMacPlatform,
      lastClickRef,
      lastGraphContextEventRef,
      selectedNodesSetRef: refs.selectedNodesSetRef,
      setContextSelection,
      setHighlightVersion,
      setSelectedNodes,
    }),
    [
      dataRef,
      fileInfoCacheRef,
      graphCursorRef,
      graphDataRef,
      graphMode,
      highlightedNeighborsRef,
      highlightedNodeRef,
      isMacPlatform,
      lastClickRef,
      lastGraphContextEventRef,
      refs.containerRef,
      refs.fg2dRef,
      refs.fg3dRef,
      refs.selectedNodesSetRef,
      setContextSelection,
      setHighlightVersion,
      setSelectedNodes,
    ],
  );

  const {
    handleMouseLeave,
    handleNodeHover,
    hoveredNodeRef,
    setTooltipData,
    stopTooltipTracking,
    tooltipData,
    tooltipTimeoutRef,
  } = useGraphTooltip({
    containerRef: refs.containerRef,
    dataRef,
    fg2dRef: refs.fg2dRef,
    fileInfoCacheRef,
    interactionHandlers: buildTooltipInteractionHandlers(interactionHandlers),
    pluginHost,
    postMessage,
  });

  const contextMenuRuntime = useMemo(
    () => createGraphContextMenuRuntime(buildContextMenuRuntimeDependencies({
      fileInfoCacheRef,
      hoveredNodeRef,
      interactionHandlers,
      lastContainerContextMenuEventRef,
      lastGraphContextEventRef,
      refs,
      setContextSelection,
      setTooltipData,
      stopTooltipTracking,
      tooltipTimeoutRef,
    })),
    [
      fileInfoCacheRef,
      hoveredNodeRef,
      interactionHandlers,
      lastContainerContextMenuEventRef,
      lastGraphContextEventRef,
      refs,
      setContextSelection,
      setTooltipData,
      stopTooltipTracking,
      tooltipTimeoutRef,
    ],
  );

  const contextMenuHandlers = useMemo(
    () => buildContextMenuRuntimeHandlers(contextMenuRuntime, graphContextSelection.targets),
    [contextMenuRuntime, graphContextSelection.targets],
  );

  const interactionRuntimeHandlers = useMemo(
    () => buildInteractionRuntimeHandlers(interactionHandlers),
    [interactionHandlers],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const container = refs.containerRef.current;
      if (!container) return;
      applyCursorToGraphSurface(container, graphCursorRef.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [graphCursorRef, graphMode, refs.containerRef]);

  useEffect(
    () => () => {
      contextMenuRuntime.clearRightClickFallbackTimer();
    },
    [contextMenuRuntime],
  );

  return {
    contextMenuRuntime,
    ...interactionRuntimeHandlers,
    ...contextMenuHandlers,
    handleEngineStop: handleGraphEngineStop,
    handleMouseLeave,
    handleNodeHover,
    hoveredNodeRef,
    interactionHandlers,
    setTooltipData,
    stopTooltipTracking,
    tooltipData,
    tooltipTimeoutRef,
  };
}
