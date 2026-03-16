import {
  useCallback,
  useEffect,
  useMemo,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type { IGraphData } from '../../../../shared/types';
import type { GraphContextMenuAction, GraphContextSelection } from '../../graphContextMenu';
import { createGraphContextMenuRuntime } from '../contextMenuRuntime';
import { createGraphInteractionHandlers } from '../interactionHandlers';
import type { GraphCursorStyle } from '../../graphSupport';
import { applyCursorToGraphSurface } from '../../graphSupport';
import { useGraphTooltip } from './useGraphTooltip';
import type { FGLink, FGNode } from '../../graphModel';
import type { UseGraphStateResult } from './useGraphState';
import type { WebviewPluginHost } from '../../../pluginHost';
import { postMessage } from '../../../lib/vscodeApi';

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
    interactionHandlers: {
      sendGraphInteraction: (event, eventData) => interactionHandlers.sendGraphInteraction(event, eventData),
      setGraphCursor: cursor => interactionHandlers.setGraphCursor(cursor),
    },
    pluginHost,
    postMessage,
  });

  const contextMenuRuntime = useMemo(
    () => createGraphContextMenuRuntime({
      hoveredNodeRef,
      lastContainerContextMenuEventRef,
      lastGraphContextEventRef,
      rightClickFallbackTimerRef: refs.rightClickFallbackTimerRef,
      rightMouseDownRef: refs.rightMouseDownRef,
      tooltipTimeoutRef,
      clearCachedFile: path => fileInfoCacheRef.current.delete(path),
      fitView: () => interactionHandlers.fitView(),
      focusNode: nodeId => interactionHandlers.focusNodeById(nodeId),
      openBackgroundContextMenu: event => interactionHandlers.openBackgroundContextMenu(event),
      postMessage,
      setContextSelection,
      setTooltipData,
      stopTooltipTracking,
    }),
    [
      fileInfoCacheRef,
      hoveredNodeRef,
      interactionHandlers,
      lastContainerContextMenuEventRef,
      lastGraphContextEventRef,
      refs.rightClickFallbackTimerRef,
      refs.rightMouseDownRef,
      setContextSelection,
      setTooltipData,
      stopTooltipTracking,
      tooltipTimeoutRef,
    ],
  );

  const handleMouseDownCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    contextMenuRuntime.handleMouseDownCapture({
      button: event.button,
      clientX: event.clientX,
      clientY: event.clientY,
      ctrlKey: event.ctrlKey,
    });
  }, [contextMenuRuntime]);

  const handleMouseMoveCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    contextMenuRuntime.handleMouseMoveCapture({
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }, [contextMenuRuntime]);

  const handleMouseUpCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    contextMenuRuntime.handleMouseUpCapture({ button: event.button });
  }, [contextMenuRuntime]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const container = refs.containerRef.current;
      if (!container) return;
      applyCursorToGraphSurface(container, graphCursorRef.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [graphCursorRef, graphMode, refs.containerRef]);

  const handleNodeRightClick = useCallback((node: FGNode, event: MouseEvent) => {
    interactionHandlers.openNodeContextMenu(node.id, event);
  }, [interactionHandlers]);

  const handleBackgroundRightClick = useCallback((event: MouseEvent) => {
    interactionHandlers.openBackgroundContextMenu(event);
  }, [interactionHandlers]);

  const handleLinkRightClick = useCallback((link: FGLink, event: MouseEvent) => {
    interactionHandlers.openEdgeContextMenu(link, event);
  }, [interactionHandlers]);

  const handleContextMenu = useCallback(() => {
    contextMenuRuntime.handleContextMenu();
  }, [contextMenuRuntime]);

  useEffect(
    () => () => {
      contextMenuRuntime.clearRightClickFallbackTimer();
    },
    [contextMenuRuntime],
  );

  const handleMenuAction = useCallback((action: GraphContextMenuAction) => {
    contextMenuRuntime.handleMenuAction(action, graphContextSelection.targets);
  }, [contextMenuRuntime, graphContextSelection.targets]);

  const handleEngineStop = useCallback(() => {
    postMessage({ type: 'PHYSICS_STABILIZED' });
  }, []);

  return {
    contextMenuRuntime,
    handleBackgroundRightClick,
    handleContextMenu,
    handleEngineStop,
    handleLinkRightClick,
    handleMenuAction,
    handleMouseDownCapture,
    handleMouseLeave,
    handleMouseMoveCapture,
    handleMouseUpCapture,
    handleNodeHover,
    handleNodeRightClick,
    hoveredNodeRef,
    interactionHandlers,
    setTooltipData,
    stopTooltipTracking,
    tooltipData,
    tooltipTimeoutRef,
  };
}
