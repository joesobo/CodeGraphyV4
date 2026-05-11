import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { GraphContextMenuAction, GraphContextSelection } from '../../contextMenu/contracts';
import {
  resolveGraphContextActionContext,
} from '../../contextActions/context';
import {
  createGraphContextMenuOpeningRuntime,
  type GraphContextMenuOpeningRuntime,
} from '../../contextMenuOpening/runtime';
import { createGraphInteractionHandlers } from '../../interactionRuntime/handlers';
import type { GraphCursorStyle } from '../../support/dom';
import { applyCursorToGraphSurface } from '../../support/dom';
import {
  useGraphTooltip,
  type GraphTooltipInteractionDependencies,
} from './tooltip/hook';
import type { FGNode } from '../../model/build';
import {
  createSuppressedContextMenuHandlers,
  useContextMenuSuppression,
} from './interaction/contextSuppression';
import {
  applyNodeDrag,
  releaseDraggedNodes,
  type NodeDragGroupSession,
  type NodeDragTranslate,
} from './interaction/nodeDrag';
import { useGraphViewportPanRuntime } from './interaction/viewportPan/hook';
import {
  getMarqueeBounds,
  getMarqueeSelectedNodeIds,
  isMarqueePastThreshold,
  type GraphMarqueeSelectionState,
  type MarqueePoint,
} from '../../marqueeSelection/model';
import type { UseGraphStateResult } from './state';
import type { WebviewPluginHost } from '../../../../pluginHost/manager';
import { postMessage } from '../../../../vscodeApi';

export interface UseGraphInteractionRuntimeOptions {
  dataRef: MutableRefObject<IGraphData>;
  depthMode: boolean;
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
  openFilterPatternPrompt?: (patterns: string[]) => void;
  openLegendRulePrompt?: (rule: { pattern: string; color: string; target: 'node' | 'edge' }) => void;
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
  contextMenuRuntime: GraphContextMenuOpeningRuntime['contextMenuRuntime'];
  handleBackgroundRightClick: GraphContextMenuOpeningRuntime['handleBackgroundRightClick'];
  handleContextMenu: GraphContextMenuOpeningRuntime['handleContextMenu'];
  handleEngineStop(this: void): void;
  handleLinkRightClick: GraphContextMenuOpeningRuntime['handleLinkRightClick'];
  handleMenuAction(this: void, action: GraphContextMenuAction): void;
  handleMouseDownCapture: GraphContextMenuOpeningRuntime['handleMouseDownCapture'];
  handleMouseLeave(this: void): void;
  handleMouseMoveCapture: GraphContextMenuOpeningRuntime['handleMouseMoveCapture'];
  handleMouseUpCapture: GraphContextMenuOpeningRuntime['handleMouseUpCapture'];
  handleNodeDrag(this: void, node: FGNode, translate: NodeDragTranslate): void;
  handleNodeDragEnd(this: void, node: FGNode): void;
  handleNodeHover(this: void, node: FGNode | null): void;
  handleNodeRightClick: GraphContextMenuOpeningRuntime['handleNodeRightClick'];
  hoveredNodeRef: MutableRefObject<FGNode | null>;
  interactionHandlers: ReturnType<typeof createGraphInteractionHandlers>;
  marqueeSelection: GraphMarqueeSelectionState | null;
  setTooltipData: ReturnType<typeof useGraphTooltip>['setTooltipData'];
  stopTooltipTracking: ReturnType<typeof useGraphTooltip>['stopTooltipTracking'];
  tooltipData: ReturnType<typeof useGraphTooltip>['tooltipData'];
  tooltipTimeoutRef: ReturnType<typeof useGraphTooltip>['tooltipTimeoutRef'];
}

type GraphInteractionHandlersRuntime = ReturnType<typeof createGraphInteractionHandlers>;

const MARQUEE_DRAG_THRESHOLD_PX = 6;

interface MarqueeDragState {
  additive: boolean;
  current: MarqueePoint;
  selecting: boolean;
  start: MarqueePoint;
}

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

function getLocalMarqueePoint(
  event: ReactMouseEvent<HTMLDivElement>,
  container: HTMLDivElement | null,
): MarqueePoint {
  const rect = container?.getBoundingClientRect();

  return {
    x: event.clientX - (rect?.left ?? 0),
    y: event.clientY - (rect?.top ?? 0),
  };
}

export function useGraphInteractionRuntime({
  dataRef,
  depthMode,
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
  openFilterPatternPrompt,
  openLegendRulePrompt,
  pluginHost,
  refs,
  setContextSelection,
  setHighlightVersion,
  setSelectedNodes,
}: UseGraphInteractionRuntimeOptions): UseGraphInteractionRuntimeResult {
  const nodeDragGroupRef = useRef<NodeDragGroupSession | null>(null);
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
      setContextSelection,
      setHighlightVersion,
      setSelectedNodes,
      toggleFolderCollapse: (nodeId, collapsed) => {
        postMessage({ type: 'UPDATE_GRAPH_LAYOUT_COLLAPSE', payload: { nodeId, collapsed } });
      },
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
  const viewportPanRuntime = useGraphViewportPanRuntime({
    containerRef: refs.containerRef,
    fg2dRef: refs.fg2dRef,
    graphMode,
    rightMouseDownRef: refs.rightMouseDownRef,
    suppressContextMenu: contextMenuSuppression.suppressContextMenu,
  });
  const marqueeDragRef = useRef<MarqueeDragState | null>(null);
  const [marqueeSelection, setMarqueeSelection] = useState<GraphMarqueeSelectionState | null>(null);

  const actionContext = useMemo(
    () => resolveGraphContextActionContext(graphContextSelection),
    [graphContextSelection],
  );

  function clearMarqueeSelection(): void {
    marqueeDragRef.current = null;
    setMarqueeSelection(null);
  }

  function handleMarqueeMouseDownCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    if (
      event.button !== 0
      || event.ctrlKey
      || graphMode !== '2d'
      || hoveredNodeRef.current
    ) {
      clearMarqueeSelection();
      return;
    }

    const point = getLocalMarqueePoint(event, refs.containerRef.current);
    marqueeDragRef.current = {
      additive: event.shiftKey,
      current: point,
      selecting: false,
      start: point,
    };
  }

  function handleMarqueeMouseMoveCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    const drag = marqueeDragRef.current;
    if (!drag) {
      return;
    }

    const current = getLocalMarqueePoint(event, refs.containerRef.current);
    drag.current = current;

    if (!drag.selecting) {
      drag.selecting = isMarqueePastThreshold(
        drag.start,
        current,
        MARQUEE_DRAG_THRESHOLD_PX,
      );
    }

    if (drag.selecting) {
      event.preventDefault();
      setMarqueeSelection({ bounds: getMarqueeBounds(drag.start, current) });
    }
  }

  function handleMarqueeMouseUpCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    if (event.button !== 0) {
      return;
    }

    const drag = marqueeDragRef.current;
    clearMarqueeSelection();

    if (!drag?.selecting) {
      return;
    }

    event.preventDefault();
    const graph = refs.fg2dRef.current;
    const selectedNodeIds = getMarqueeSelectedNodeIds({
      bounds: getMarqueeBounds(drag.start, drag.current),
      graphToScreen: (x, y) => graph?.graph2ScreenCoords?.(x, y) ?? { x, y },
      nodes: graphDataRef.current.nodes,
    });
    const nextSelectedNodeIds = drag.additive
      ? [...new Set([...refs.selectedNodesSetRef.current, ...selectedNodeIds])]
      : selectedNodeIds;
    interactionHandlers.setHighlight(null);
    interactionHandlers.setSelection(nextSelectedNodeIds);
  }

  function handleNodeDrag(node: FGNode, translate: NodeDragTranslate): void {
    nodeDragGroupRef.current = applyNodeDrag(node, translate, {
      graphData: graphDataRef.current,
      graphMode,
      selectedNodeIds: refs.selectedNodesSetRef.current,
    }, nodeDragGroupRef.current);
    clearMarqueeSelection();
  }

  function handleNodeDragEnd(node: FGNode): void {
    releaseDraggedNodes(node, nodeDragGroupRef.current, {
      graphData: graphDataRef.current,
      graphMode,
    });
    nodeDragGroupRef.current = null;
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
    handleMarqueeMouseDownCapture(event);
    contextMenuOpeningRuntime.handleMouseDownCapture(event);
  }

  function handleMouseMoveCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    viewportPanRuntime.handleMouseMoveCapture(event);
    handleMarqueeMouseMoveCapture(event);
    contextMenuOpeningRuntime.handleMouseMoveCapture(event);
  }

  function handleMouseUpCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    viewportPanRuntime.handleMouseUpCapture(event);
    handleMarqueeMouseUpCapture(event);
    contextMenuOpeningRuntime.handleMouseUpCapture(event);
  }

  function handleGraphMouseLeave(): void {
    clearMarqueeSelection();
    handleMouseLeave();
  }

  return {
    ...contextMenuOpeningRuntime,
    handleBackgroundRightClick: suppressedContextMenuHandlers.handleBackgroundRightClick,
    handleContextMenu: suppressedContextMenuHandlers.handleContextMenu,
    handleEngineStop: handleGraphEngineStop,
    handleLinkRightClick: suppressedContextMenuHandlers.handleLinkRightClick,
    handleMouseLeave: handleGraphMouseLeave,
    handleNodeDrag,
    handleNodeDragEnd,
    handleNodeHover,
    handleNodeRightClick: suppressedContextMenuHandlers.handleNodeRightClick,
    handleMouseDownCapture,
    handleMouseMoveCapture,
    handleMouseUpCapture,
    hoveredNodeRef,
    interactionHandlers,
    marqueeSelection,
    setTooltipData,
    stopTooltipTracking,
    tooltipData,
    tooltipTimeoutRef,
  };
}
