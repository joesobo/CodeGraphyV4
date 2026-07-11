import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { resolveGraphContextActionContext } from '../../../contextActions/context';
import type { GraphContextSelection } from '../../../contextMenu/contracts';
import { createGraphContextMenuOpeningRuntime } from '../../../contextMenuOpening/runtime';
import { createGraphInteractionHandlers } from '../../../interactionRuntime/handlers';
import { applyCursorToGraphSurface } from '../../../support/dom';
import { useGraphTooltip } from '../tooltip/hook';
import type { FGNode } from '../../../model/build';
import { postMessage } from '../../../../../vscodeApi';
import type {
  UseGraphInteractionRuntimeOptions,
  UseGraphInteractionRuntimeResult,
} from './contracts';
import {
  createSuppressedContextMenuHandlers,
  useContextMenuSuppression,
} from './contextSuppression';
import { useGraphMarqueeSelectionRuntime } from './marquee/hook';
import {
  applyNodeDrag,
  postDraggedNodesDragEndMessages,
  type NodeDragGroupSession,
  type NodeDragTranslate,
} from './nodeDrag';
import { useGraphViewportPanRuntime } from './viewportPan/hook';
import { postPhysicsStabilized } from './engineStop';
import { buildTooltipInteractionHandlers } from './tooltipAdapter';
import { readGraphViewportScale } from './viewportScale';

export function useGraphInteractionRuntime({
  dataRef,
  depthMode,
  fileInfoCacheRef,
  graphContextSelection,
  graphCursorRef,
  graphDataRef,
  graphViewContributions,
  graphMode,
  highlightedNeighborsRef,
  highlightedNodeRef,
  isMacPlatform,
  lastClickRef,
  lastContainerContextMenuEventRef,
  lastGraphContextEventRef,
  openFilterPatternPrompt,
  openLegendRulePrompt,
  pluginHost,
  refs,
  setContextSelection,
  setHighlightVersion,
  setSelectedNodes,
  timelineActive = false,
}: UseGraphInteractionRuntimeOptions): UseGraphInteractionRuntimeResult {
  const nodeDragGroupRef = useRef<NodeDragGroupSession | null>(null);
  const nodeDragActiveRef = useRef(false);
  const graphContextSelectionRef = useRef(graphContextSelection);
  graphContextSelectionRef.current = graphContextSelection;
  const setLiveContextSelection = useCallback<typeof setContextSelection>((nextSelection) => {
    const resolvedSelection = typeof nextSelection === 'function'
      ? nextSelection(graphContextSelectionRef.current)
      : nextSelection;
    graphContextSelectionRef.current = resolvedSelection;
    setContextSelection(resolvedSelection);
  }, [setContextSelection]);
  const contextMenuSuppression = useContextMenuSuppression();
  const interactionHandlers = useMemo(
    () => createGraphInteractionHandlers({
      containerRef: refs.containerRef,
      dataRef,
      depthMode,
      fg2dRef: refs.fg2dRef,
      fg3dRef: refs.fg3dRef,
      fileInfoCacheRef,
      graphCursorRef,
      graphDataRef,
      graphMode,
      highlightedNeighborsRef,
      highlightedNodeRef,
      isContextMenuSuppressed: contextMenuSuppression.isContextMenuSuppressed,
      isMacPlatform,
      lastClickRef,
      lastGraphContextEventRef,
      selectedNodesSetRef: refs.selectedNodesSetRef,
      setContextSelection: setLiveContextSelection,
      setHighlightVersion,
      setSelectedNodes,
    }),
    [
      dataRef,
      depthMode,
      fileInfoCacheRef,
      graphCursorRef,
      graphDataRef,
      graphMode,
      highlightedNeighborsRef,
      highlightedNodeRef,
      contextMenuSuppression.isContextMenuSuppressed,
      isMacPlatform,
      lastClickRef,
      lastGraphContextEventRef,
      refs.containerRef,
      refs.fg2dRef,
      refs.fg3dRef,
      refs.selectedNodesSetRef,
      setLiveContextSelection,
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
  const viewportPanRuntime = useGraphViewportPanRuntime({
    containerRef: refs.containerRef,
    fg2dRef: refs.fg2dRef,
    graphMode,
    rightMouseDownRef: refs.rightMouseDownRef,
    suppressContextMenu: contextMenuSuppression.suppressContextMenu,
  });
  const marqueeRuntime = useGraphMarqueeSelectionRuntime({
    containerRef: refs.containerRef,
    fg2dRef: refs.fg2dRef,
    graphDataRef,
    graphMode,
    hoveredNodeRef,
    interactionHandlers,
    selectedNodesSetRef: refs.selectedNodesSetRef,
  });

  const getActionContext = useCallback(
    (selection: GraphContextSelection) => resolveGraphContextActionContext(selection, {
      graphViewportScale: readGraphViewportScale(graphMode, refs.fg2dRef.current),
      nodes: graphDataRef.current.nodes,
      timelineActive,
    }),
    [graphDataRef, graphMode, refs.fg2dRef, timelineActive],
  );

  function handleNodeDragEnd(node: FGNode): void {
    postDraggedNodesDragEndMessages(node, nodeDragGroupRef.current, {
      graphData: graphDataRef.current,
      graphViewContributions,
      graphMode,
      timelineActive,
    });
    nodeDragGroupRef.current = null;
    nodeDragActiveRef.current = false;
  }

  function handleNodeDrag(node: FGNode, translate: NodeDragTranslate): void {
    if (!nodeDragActiveRef.current) {
      const graph = graphMode === '2d' ? refs.fg2dRef.current : refs.fg3dRef.current;
      graph?.resumeAnimation?.();
      graph?.d3ReheatSimulation?.();
      nodeDragActiveRef.current = true;
    }

    nodeDragGroupRef.current = applyNodeDrag(node, translate, {
      graphData: graphDataRef.current,
      graphMode,
      selectedNodeIds: refs.selectedNodesSetRef.current,
    }, nodeDragGroupRef.current);

    marqueeRuntime.clearMarqueeSelection();
  }

  const contextMenuOpeningRuntime = useMemo(
    () => createGraphContextMenuOpeningRuntime({
      fileInfoCacheRef,
      getActionContext,
      hoveredNodeRef,
      interactionHandlers,
      lastContainerContextMenuEventRef,
      lastGraphContextEventRef,
      openFilterPatternPrompt,
      openLegendRulePrompt,
      refs,
      setContextSelection: setLiveContextSelection,
      setTooltipData,
      stopTooltipTracking,
      tooltipTimeoutRef,
    }),
    [
      fileInfoCacheRef,
      getActionContext,
      hoveredNodeRef,
      interactionHandlers,
      lastContainerContextMenuEventRef,
      lastGraphContextEventRef,
      openFilterPatternPrompt,
      openLegendRulePrompt,
      refs,
      setLiveContextSelection,
      setTooltipData,
      stopTooltipTracking,
      tooltipTimeoutRef,
    ],
  );
  const suppressedContextMenuHandlers = useMemo(
    () => createSuppressedContextMenuHandlers(
      contextMenuOpeningRuntime,
      contextMenuSuppression,
    ),
    [contextMenuOpeningRuntime, contextMenuSuppression],
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
      contextMenuOpeningRuntime.contextMenuRuntime.clearRightClickFallbackTimer();
    },
    [contextMenuOpeningRuntime.contextMenuRuntime],
  );

  function handleMouseDownCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    viewportPanRuntime.handleMouseDownCapture(event);
    marqueeRuntime.handleMouseDownCapture(event);
    contextMenuOpeningRuntime.handleMouseDownCapture(event);
  }

  function handleMouseMoveCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    viewportPanRuntime.handleMouseMoveCapture(event);
    marqueeRuntime.handleMouseMoveCapture(event);
    contextMenuOpeningRuntime.handleMouseMoveCapture(event);
  }

  function handleMouseUpCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    viewportPanRuntime.handleMouseUpCapture(event);
    marqueeRuntime.handleMouseUpCapture(event);
    contextMenuOpeningRuntime.handleMouseUpCapture(event);
  }

  function handleGraphMouseLeave(): void {
    marqueeRuntime.clearMarqueeSelection();
    handleMouseLeave();
  }

  return {
    ...contextMenuOpeningRuntime,
    handleBackgroundRightClick: suppressedContextMenuHandlers.handleBackgroundRightClick,
    handleContextMenu: suppressedContextMenuHandlers.handleContextMenu,
    handleEngineStop: () => postPhysicsStabilized(postMessage),
    handleLinkRightClick: suppressedContextMenuHandlers.handleLinkRightClick,
    handleMouseLeave: handleGraphMouseLeave,
    handleNodeHover,
    handleNodeDragEnd,
    handleNodeRightClick: suppressedContextMenuHandlers.handleNodeRightClick,
    handleMouseDownCapture,
    handleMouseMoveCapture,
    handleMouseUpCapture,
    handleNodeDrag,
    hoveredNodeRef,
    interactionHandlers,
    marqueeSelection: marqueeRuntime.marqueeSelection,
    setTooltipData,
    stopTooltipTracking,
    tooltipData,
    tooltipTimeoutRef,
  };
}
