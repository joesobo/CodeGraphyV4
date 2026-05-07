import {
  useEffect,
  useMemo,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { resolveGraphContextActionContext } from '../../../contextActions/context';
import { createGraphContextMenuOpeningRuntime } from '../../../contextMenuOpening/runtime';
import { createGraphInteractionHandlers } from '../../../interactionRuntime/handlers';
import { applyCursorToGraphSurface } from '../../../support/dom';
import {
  useGraphTooltip,
  type GraphTooltipInteractionDependencies,
} from '../tooltip/hook';
import type { FGNode } from '../../../model/build';
import { postMessage } from '../../../../../vscodeApi';
import type {
  GraphInteractionHandlersRuntime,
  UseGraphInteractionRuntimeOptions,
  UseGraphInteractionRuntimeResult,
} from './contracts';
import {
  createSuppressedContextMenuHandlers,
  useContextMenuSuppression,
} from './contextSuppression';
import { useGraphMarqueeSelectionRuntime } from './marquee/hook';
import { postNodeDragEndMessages } from './nodeDrag';
import { createGraphNodePositionMap } from './positions';
import { useGraphViewportPanRuntime } from './viewportPan/hook';

function buildTooltipInteractionHandlers(
  interactionHandlers: GraphInteractionHandlersRuntime,
): GraphTooltipInteractionDependencies {
  return {
    sendGraphInteraction: interactionHandlers.sendGraphInteraction,
    setGraphCursor: interactionHandlers.setGraphCursor,
  };
}

function handleGraphEngineStop(): void {
  postMessage({ type: 'PHYSICS_STABILIZED' });
}

export function useGraphInteractionRuntime({
  dataRef,
  depthMode,
  fileInfoCacheRef,
  graphContextSelection,
  graphCursorRef,
  graphDataRef,
  graphLayout,
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
      depthMode,
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
  const contextMenuSuppression = useContextMenuSuppression();

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

  const actionContext = useMemo(
    () => resolveGraphContextActionContext(graphContextSelection, {
      graphMode,
      nodePositions: createGraphNodePositionMap(graphDataRef.current.nodes, graphMode),
    }),
    [graphContextSelection, graphDataRef, graphMode],
  );

  function handleNodeDragEnd(node: FGNode): void {
    postNodeDragEndMessages(node, graphLayout, graphMode, timelineActive);
  }

  const contextMenuOpeningRuntime = useMemo(
    () => createGraphContextMenuOpeningRuntime({
      actionContext,
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
    }),
    [
      actionContext,
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
    handleEngineStop: handleGraphEngineStop,
    handleLinkRightClick: suppressedContextMenuHandlers.handleLinkRightClick,
    handleMouseLeave: handleGraphMouseLeave,
    handleNodeHover,
    handleNodeDragEnd,
    handleNodeRightClick: suppressedContextMenuHandlers.handleNodeRightClick,
    handleMouseDownCapture,
    handleMouseMoveCapture,
    handleMouseUpCapture,
    hoveredNodeRef,
    interactionHandlers,
    marqueeSelection: marqueeRuntime.marqueeSelection,
    setTooltipData,
    stopTooltipTracking,
    tooltipData,
    tooltipTimeoutRef,
  };
}
