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
import type { FGLink, FGNode } from '../../model/build';
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
  handleContextMenu(this: void, event?: ReactMouseEvent<HTMLDivElement>): void;
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
const VIEWPORT_PAN_DRAG_THRESHOLD_PX = 2;
const CONTEXT_MENU_SUPPRESSION_MS = 250;

interface MarqueeDragState {
  additive: boolean;
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
  selectedNodesSetRef: UseGraphStateResult['selectedNodesSetRef'];
}

interface GraphMarqueeSelectionRuntime {
  clearMarqueeSelection(this: void): void;
  handleMouseDownCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleMouseMoveCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleMouseUpCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  marqueeSelection: GraphMarqueeSelectionState | null;
}

interface ViewportPanDragState {
  button: number;
  center: { x: number; y: number };
  moved: boolean;
  start: MarqueePoint;
  zoom: number;
}

interface GraphViewportPanRuntimeOptions {
  containerRef: UseGraphStateResult['containerRef'];
  fg2dRef: UseGraphStateResult['fg2dRef'];
  graphMode: GraphLayoutMode;
  rightMouseDownRef: UseGraphStateResult['rightMouseDownRef'];
  suppressContextMenu(this: void): void;
}

interface GraphViewportPanRuntime {
  handleMouseDownCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleMouseMoveCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleMouseUpCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
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

function isViewportPanButton(button: number): boolean {
  return button === 1 || button === 2;
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
    && graphMode === '2d'
    && !hoveredNode;
}

function createMarqueeDragState(point: MarqueePoint, additive: boolean): MarqueeDragState {
  return {
    additive,
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
  options: Pick<GraphMarqueeSelectionRuntimeOptions, 'fg2dRef' | 'graphDataRef' | 'interactionHandlers' | 'selectedNodesSetRef'>,
): void {
  const graph = options.fg2dRef.current;
  const marqueeNodeIds = getMarqueeSelectedNodeIds({
    bounds: getMarqueeBounds(drag.start, drag.current),
    graphToScreen: (x, y) => graph?.graph2ScreenCoords?.(x, y) ?? { x, y },
    nodes: options.graphDataRef.current.nodes,
  });
  const selectedNodeIds = drag.additive
    ? [...new Set([...options.selectedNodesSetRef.current, ...marqueeNodeIds])]
    : marqueeNodeIds;
  options.interactionHandlers.setHighlight(null);
  options.interactionHandlers.setSelection(selectedNodeIds);
}

function readViewportPanCenter(
  graph: UseGraphStateResult['fg2dRef']['current'],
  container: HTMLDivElement | null,
): { x: number; y: number } {
  const rect = container?.getBoundingClientRect();
  const center = rect
    ? graph?.screen2GraphCoords?.(rect.width / 2, rect.height / 2)
    : undefined;
  return isFiniteNumber(center?.x) && isFiniteNumber(center?.y)
    ? center
    : { x: 0, y: 0 };
}

function readViewportPanZoom(
  graph: UseGraphStateResult['fg2dRef']['current'],
): number {
  const zoom = graph?.zoom?.();
  return isFiniteNumber(zoom) && zoom !== 0 ? zoom : 1;
}

function createViewportPanDragState(
  event: ReactMouseEvent<HTMLDivElement>,
  graph: UseGraphStateResult['fg2dRef']['current'],
  container: HTMLDivElement | null,
): ViewportPanDragState {
  return {
    button: event.button,
    center: readViewportPanCenter(graph, container),
    moved: false,
    start: { x: event.clientX, y: event.clientY },
    zoom: readViewportPanZoom(graph),
  };
}

function updateViewportPanDragState(
  drag: ViewportPanDragState,
  current: MarqueePoint,
): void {
  if (!drag.moved) {
    drag.moved = isMarqueePastThreshold(
      drag.start,
      current,
      VIEWPORT_PAN_DRAG_THRESHOLD_PX,
    );
  }
}

function applyViewportPanDrag(
  drag: ViewportPanDragState,
  current: MarqueePoint,
  graph: UseGraphStateResult['fg2dRef']['current'],
): void {
  graph?.centerAt?.(
    drag.center.x - ((current.x - drag.start.x) / drag.zoom),
    drag.center.y - ((current.y - drag.start.y) / drag.zoom),
    0,
  );
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
    marqueeDragRef.current = createMarqueeDragState(point, event.shiftKey);
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

function useGraphViewportPanRuntime(
  options: GraphViewportPanRuntimeOptions,
): GraphViewportPanRuntime {
  const panDragRef = useRef<ViewportPanDragState | null>(null);

  function clearPanDrag(): void {
    panDragRef.current = null;
  }

  function handleMouseDownCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    if (options.graphMode !== '2d' || !isViewportPanButton(event.button)) {
      clearPanDrag();
      return;
    }

    event.preventDefault();
    panDragRef.current = createViewportPanDragState(
      event,
      options.fg2dRef.current,
      options.containerRef.current,
    );
  }

  function handleMouseMoveCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    const drag = panDragRef.current;
    if (!drag) {
      return;
    }

    const current = { x: event.clientX, y: event.clientY };
    updateViewportPanDragState(drag, current);
    if (!drag.moved) {
      return;
    }

    event.preventDefault();
    if (drag.button === 2) {
      options.suppressContextMenu();
      if (options.rightMouseDownRef.current) {
        options.rightMouseDownRef.current.moved = true;
      }
    }
    applyViewportPanDrag(drag, current, options.fg2dRef.current);
  }

  function handleMouseUpCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    const drag = panDragRef.current;
    if (!drag || event.button !== drag.button) {
      return;
    }

    if (drag.moved) {
      event.preventDefault();
    }
    clearPanDrag();
  }

  return {
    handleMouseDownCapture,
    handleMouseMoveCapture,
    handleMouseUpCapture,
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
  const contextMenuSuppressedUntilRef = useRef(0);

  function suppressContextMenu(): void {
    contextMenuSuppressedUntilRef.current = Date.now() + CONTEXT_MENU_SUPPRESSION_MS;
  }

  function isContextMenuSuppressed(): boolean {
    return Date.now() < contextMenuSuppressedUntilRef.current;
  }

  const viewportPanRuntime = useGraphViewportPanRuntime({
    containerRef: refs.containerRef,
    fg2dRef: refs.fg2dRef,
    graphMode,
    rightMouseDownRef: refs.rightMouseDownRef,
    suppressContextMenu,
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

  function handleContextMenu(event?: ReactMouseEvent<HTMLDivElement>): void {
    if (isContextMenuSuppressed()) {
      event?.preventDefault();
      event?.stopPropagation();
      return;
    }

    contextMenuOpeningRuntime.handleContextMenu();
  }

  function handleBackgroundRightClick(event: MouseEvent): void {
    if (isContextMenuSuppressed()) {
      return;
    }

    contextMenuOpeningRuntime.handleBackgroundRightClick(event);
  }

  function handleLinkRightClick(link: FGLink, event: MouseEvent): void {
    if (isContextMenuSuppressed()) {
      return;
    }

    contextMenuOpeningRuntime.handleLinkRightClick(link, event);
  }

  function handleNodeRightClick(node: FGNode, event: MouseEvent): void {
    if (isContextMenuSuppressed()) {
      return;
    }

    contextMenuOpeningRuntime.handleNodeRightClick(node, event);
  }

  function handleGraphMouseLeave(): void {
    marqueeRuntime.clearMarqueeSelection();
    handleMouseLeave();
  }

  return {
    ...contextMenuOpeningRuntime,
    handleBackgroundRightClick,
    handleContextMenu,
    handleEngineStop: handleGraphEngineStop,
    handleLinkRightClick,
    handleMouseLeave: handleGraphMouseLeave,
    handleNodeHover,
    handleNodeDragEnd,
    handleNodeRightClick,
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
