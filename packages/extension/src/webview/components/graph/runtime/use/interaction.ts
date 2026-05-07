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
import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import {
  findDeepestGraphLayoutSectionAtPoint,
  type GraphLayoutMode,
  type GraphLayoutSettings,
} from '../../../../../shared/settings/graphLayout';
import type { GraphContextMenuAction, GraphContextSelection } from '../../contextMenu/contracts';
import {
  resolveGraphContextActionContext,
  type GraphContextNodePosition2D,
  type GraphContextNodePosition3D,
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
  graphLayout?: GraphLayoutSettings;
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
  timelineActive?: boolean;
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
  handleNodeHover(this: void, node: FGNode | null): void;
  handleNodeDragEnd(this: void, node: FGNode): void;
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
  current: MarqueePoint;
  selecting: boolean;
  start: MarqueePoint;
}

interface GraphMarqueeSelectionRuntimeOptions {
  containerRef: UseGraphStateResult['containerRef'];
  fg2dRef: UseGraphStateResult['fg2dRef'];
  graphDataRef: UseGraphStateResult['graphDataRef'];
  graphMode: GraphLayoutMode;
  hoveredNodeRef: MutableRefObject<FGNode | null>;
  interactionHandlers: GraphInteractionHandlersRuntime;
}

interface GraphMarqueeSelectionRuntime {
  clearMarqueeSelection(this: void): void;
  handleMouseDownCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleMouseMoveCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleMouseUpCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  marqueeSelection: GraphMarqueeSelectionState | null;
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readNodePosition(
  node: FGNode,
  graphMode: GraphLayoutMode,
): GraphContextNodePosition2D | GraphContextNodePosition3D | undefined {
  if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y)) {
    return undefined;
  }

  if (graphMode === '3d') {
    return isFiniteNumber(node.z)
      ? { x: node.x, y: node.y, z: node.z }
      : undefined;
  }

  return { x: node.x, y: node.y };
}

function createGraphNodePositionMap(
  nodes: readonly FGNode[],
  graphMode: GraphLayoutMode,
): Map<string, GraphContextNodePosition2D | GraphContextNodePosition3D> {
  const positions = new Map<string, GraphContextNodePosition2D | GraphContextNodePosition3D>();

  for (const node of nodes) {
    const position = readNodePosition(node, graphMode);
    if (position) {
      positions.set(node.id, position);
    }
  }

  return positions;
}

function canStartMarqueeSelection(
  event: ReactMouseEvent<HTMLDivElement>,
  graphMode: GraphLayoutMode,
  hoveredNode: FGNode | null,
): boolean {
  return event.button === 0
    && !event.shiftKey
    && graphMode === '2d'
    && !hoveredNode;
}

function createMarqueeDragState(point: MarqueePoint): MarqueeDragState {
  return {
    current: point,
    selecting: false,
    start: point,
  };
}

function updateMarqueeDragState(
  drag: MarqueeDragState,
  current: MarqueePoint,
): void {
  drag.current = current;
  if (!drag.selecting) {
    drag.selecting = isMarqueePastThreshold(
      drag.start,
      current,
      MARQUEE_DRAG_THRESHOLD_PX,
    );
  }
}

function selectMarqueeNodes(
  drag: MarqueeDragState,
  options: Pick<GraphMarqueeSelectionRuntimeOptions, 'fg2dRef' | 'graphDataRef' | 'interactionHandlers'>,
): void {
  const graph = options.fg2dRef.current;
  const selectedNodeIds = getMarqueeSelectedNodeIds({
    bounds: getMarqueeBounds(drag.start, drag.current),
    graphToScreen: (x, y) => graph?.graph2ScreenCoords?.(x, y) ?? { x, y },
    nodes: options.graphDataRef.current.nodes,
  });
  options.interactionHandlers.setHighlight(null);
  options.interactionHandlers.setSelection(selectedNodeIds);
}

function useGraphMarqueeSelectionRuntime(
  options: GraphMarqueeSelectionRuntimeOptions,
): GraphMarqueeSelectionRuntime {
  const marqueeDragRef = useRef<MarqueeDragState | null>(null);
  const [marqueeSelection, setMarqueeSelection] = useState<GraphMarqueeSelectionState | null>(null);

  function clearMarqueeSelection(): void {
    marqueeDragRef.current = null;
    setMarqueeSelection(null);
  }

  function handleMouseDownCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    if (!canStartMarqueeSelection(event, options.graphMode, options.hoveredNodeRef.current)) {
      clearMarqueeSelection();
      return;
    }

    const point = getLocalMarqueePoint(event, options.containerRef.current);
    marqueeDragRef.current = createMarqueeDragState(point);
  }

  function handleMouseMoveCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    const drag = marqueeDragRef.current;
    if (!drag) {
      return;
    }

    const current = getLocalMarqueePoint(event, options.containerRef.current);
    updateMarqueeDragState(drag, current);

    if (drag.selecting) {
      event.preventDefault();
      setMarqueeSelection({ bounds: getMarqueeBounds(drag.start, current) });
    }
  }

  function handleMouseUpCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    if (event.button !== 0) {
      return;
    }

    const drag = marqueeDragRef.current;
    clearMarqueeSelection();

    if (!drag?.selecting) {
      return;
    }

    event.preventDefault();
    selectMarqueeNodes(drag, options);
  }

  return {
    clearMarqueeSelection,
    handleMouseDownCapture,
    handleMouseMoveCapture,
    handleMouseUpCapture,
    marqueeSelection,
  };
}

function createPinnedNodeDragMessage(
  node: FGNode,
  graphMode: GraphLayoutMode,
): WebviewToExtensionMessage | undefined {
  if (!node.isPinned) {
    return undefined;
  }

  const position = readNodePosition(node, graphMode);
  if (!position) {
    return undefined;
  }

  return {
    type: 'UPDATE_GRAPH_LAYOUT_PIN',
    payload: {
      graphMode,
      nodeId: node.id,
      position,
    },
  };
}

function canUpdateGraphLayoutOwnerOnDrag(
  graphLayout: GraphLayoutSettings | undefined,
  graphMode: GraphLayoutMode,
  timelineActive: boolean,
): graphLayout is GraphLayoutSettings {
  return !!graphLayout && graphMode === '2d' && !timelineActive;
}

function createGraphLayoutOwnerDragMessage(
  node: FGNode,
  graphLayout: GraphLayoutSettings | undefined,
  graphMode: GraphLayoutMode,
  timelineActive: boolean,
): WebviewToExtensionMessage | undefined {
  if (!canUpdateGraphLayoutOwnerOnDrag(graphLayout, graphMode, timelineActive)) {
    return undefined;
  }

  const position = readNodePosition(node, graphMode);
  if (!position) {
    return undefined;
  }

  const ownerSectionId = findDeepestGraphLayoutSectionAtPoint(graphLayout, position);
  const currentOwnerSectionId = graphLayout.ownership[node.id]?.ownerSectionId ?? null;
  if (ownerSectionId === currentOwnerSectionId) {
    return undefined;
  }

  return {
    type: 'UPDATE_GRAPH_LAYOUT_OWNER',
    payload: {
      itemId: node.id,
      itemKind: 'node',
      ownerSectionId,
    },
  };
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
  const marqueeRuntime = useGraphMarqueeSelectionRuntime({
    containerRef: refs.containerRef,
    fg2dRef: refs.fg2dRef,
    graphDataRef,
    graphMode,
    hoveredNodeRef,
    interactionHandlers,
  });

  const actionContext = useMemo(
    () => resolveGraphContextActionContext(graphContextSelection, {
      graphMode,
      nodePositions: createGraphNodePositionMap(graphDataRef.current.nodes, graphMode),
    }),
    [graphContextSelection, graphDataRef, graphMode],
  );

  function handleNodeDragEnd(node: FGNode): void {
    const messages = [
      createPinnedNodeDragMessage(node, graphMode),
      createGraphLayoutOwnerDragMessage(node, graphLayout, graphMode, timelineActive),
    ];

    for (const message of messages) {
      if (!message) {
        continue;
      }

      postMessage(message);
    }
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
    marqueeRuntime.handleMouseDownCapture(event);
    contextMenuOpeningRuntime.handleMouseDownCapture(event);
  }

  function handleMouseMoveCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    marqueeRuntime.handleMouseMoveCapture(event);
    contextMenuOpeningRuntime.handleMouseMoveCapture(event);
  }

  function handleMouseUpCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    marqueeRuntime.handleMouseUpCapture(event);
    contextMenuOpeningRuntime.handleMouseUpCapture(event);
  }

  function handleGraphMouseLeave(): void {
    marqueeRuntime.clearMarqueeSelection();
    handleMouseLeave();
  }

  return {
    ...contextMenuOpeningRuntime,
    handleEngineStop: handleGraphEngineStop,
    handleMouseLeave: handleGraphMouseLeave,
    handleNodeHover,
    handleNodeDragEnd,
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
