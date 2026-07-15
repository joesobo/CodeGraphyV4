import type {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  SetStateAction,
  WheelEvent as ReactWheelEvent,
} from 'react';
import type { FGLink, FGNode } from '../../../model/build';
import { shouldEnableGraphEdgeHover } from '@codegraphy-dev/graph-renderer';
import {
  cancelOwnedGraphCameraTransition,
  clampOwnedGraphZoom,
  screenToGraph,
  type OwnedGraphCamera,
} from './camera';
import {
  canvasPointerGeometry,
  type CanvasPointerGeometry,
} from './canvasGeometry';
import type { Surface2dProps } from './contracts';
import { releaseOwnedDraggedNodes, synchronizeOwnedDraggedNodes } from './drag';
import { syncOwnedLayoutNodesAtVersion, type OwnedGraphLayout } from './layout';
import type { OwnedGraphLinkPicker } from './linkPicking';
import type { OwnedGraphNodePicker } from './picking';
import {
  setOwnedGraphNodeHover,
  type OwnedGraphNodeHover,
} from './nodeHover';

export interface ContextGestureSession {
  button: 0 | 2;
  moved: boolean;
  pointerId: number;
  startScreen: { x: number; y: number };
}

export interface PointerSession {
  draggedIndexes: Set<number>;
  index: number | null;
  node: FGNode | null;
  nodeId: string | null;
  link: FGLink | null;
  lastWorld: { x: number; y: number };
  moved: boolean;
  startScreen: { x: number; y: number };
}

export interface LinkTooltip {
  link: FGLink;
  screen: { x: number; y: number };
}

interface OwnedGraphInteractionRuntime {
  cameraRef: MutableRefObject<OwnedGraphCamera>;
  clearLinkHover(this: void): boolean;
  contextGestureSessionRef: MutableRefObject<ContextGestureSession | null>;
  engineStopNotifiedRef: MutableRefObject<boolean>;
  hoveredLinkRef: MutableRefObject<FGLink | null>;
  hoveredNodeRef: MutableRefObject<FGNode | null>;
  layoutRef: MutableRefObject<OwnedGraphLayout | null>;
  linkPickerPositionVersionRef: MutableRefObject<number>;
  linkPickerRef: MutableRefObject<OwnedGraphLinkPicker>;
  nodeHoverRef: MutableRefObject<OwnedGraphNodeHover>;
  pickerPositionVersionRef: MutableRefObject<number>;
  pickerRef: MutableRefObject<OwnedGraphNodePicker>;
  pointerSessionRef: MutableRefObject<PointerSession | null>;
  positionVersionRef: MutableRefObject<number>;
  propsRef: MutableRefObject<Surface2dProps>;
  requestFrameRef: MutableRefObject<() => void>;
  setLinkTooltip: Dispatch<SetStateAction<LinkTooltip | null>>;
  synchronizedPositionVersionRef: MutableRefObject<number>;
}

export interface OwnedGraphInteractionHandlers {
  handleContextMenu(this: void, event: ReactMouseEvent<HTMLCanvasElement>): void;
  handlePointerCancel(this: void, event: ReactPointerEvent<HTMLCanvasElement>): void;
  handlePointerDown(this: void, event: ReactPointerEvent<HTMLCanvasElement>): void;
  handlePointerLeave(this: void): void;
  handlePointerMove(this: void, event: ReactPointerEvent<HTMLCanvasElement>): void;
  handlePointerUp(this: void, event: ReactPointerEvent<HTMLCanvasElement>): void;
  handleWheel(this: void, event: ReactWheelEvent<HTMLCanvasElement>): void;
}

const CONTEXT_GESTURE_DRAG_THRESHOLD_PX = 2;
const NODE_DRAG_THRESHOLD_PX = 3;

function screenToWorld(
  camera: OwnedGraphCamera,
  pointer: CanvasPointerGeometry,
): { x: number; y: number } {
  return screenToGraph(camera, pointer.width, pointer.height, pointer.x, pointer.y);
}

function synchronizeAuthoritativeNodes(
  runtime: OwnedGraphInteractionRuntime,
  layout: OwnedGraphLayout,
): void {
  runtime.synchronizedPositionVersionRef.current = syncOwnedLayoutNodesAtVersion(
    layout,
    runtime.positionVersionRef.current,
    runtime.synchronizedPositionVersionRef.current,
  );
}

function pickNode(
  runtime: OwnedGraphInteractionRuntime,
  layout: OwnedGraphLayout,
  world: { x: number; y: number },
) {
  synchronizeAuthoritativeNodes(runtime, layout);
  if (runtime.pickerPositionVersionRef.current !== runtime.positionVersionRef.current) {
    runtime.pickerRef.current.rebuild(layout.nodes);
    runtime.pickerPositionVersionRef.current = runtime.positionVersionRef.current;
  }
  const picked = runtime.pickerRef.current.pick(world, runtime.cameraRef.current.zoom);
  return picked;
}

function pickLink(
  runtime: OwnedGraphInteractionRuntime,
  layout: OwnedGraphLayout,
  world: { x: number; y: number },
) {
  synchronizeAuthoritativeNodes(runtime, layout);
  if (runtime.linkPickerPositionVersionRef.current !== runtime.positionVersionRef.current) {
    runtime.linkPickerRef.current.rebuild(layout.links);
    runtime.linkPickerPositionVersionRef.current = runtime.positionVersionRef.current;
  }
  const picked = runtime.linkPickerRef.current.pick(world, runtime.cameraRef.current.zoom);
  return picked;
}

function movedPastThreshold(
  start: { x: number; y: number },
  current: { x: number; y: number },
  threshold: number,
): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) > threshold;
}

function clearHoverForInteraction(runtime: OwnedGraphInteractionRuntime): boolean {
  const hadNodeHover = runtime.hoveredNodeRef.current !== null;
  runtime.hoveredNodeRef.current = null;
  setOwnedGraphNodeHover(runtime.nodeHoverRef.current, null, performance.now());
  if (hadNodeHover) runtime.propsRef.current.sharedProps.onNodeHover(null);
  const hadLinkHover = runtime.clearLinkHover();
  return hadNodeHover || hadLinkHover;
}

function contextGestureButton(
  event: ReactPointerEvent<HTMLCanvasElement>,
): 0 | 2 | null {
  if (event.button === 2) return 2;
  return event.button === 0 && event.ctrlKey ? 0 : null;
}

function beginContextGesture(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactPointerEvent<HTMLCanvasElement>,
  screen: { x: number; y: number },
  button: 0 | 2,
): void {
  runtime.contextGestureSessionRef.current = {
    button,
    moved: false,
    pointerId: event.pointerId,
    startScreen: screen,
  };
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

function createPointerSession(
  picked: { index: number; node: FGNode } | undefined,
  link: FGLink | null,
  world: { x: number; y: number },
  screen: { x: number; y: number },
): PointerSession {
  if (!picked) {
    return {
      draggedIndexes: new Set(),
      index: null,
      nodeId: null,
      link,
      lastWorld: world,
      moved: false,
      node: null,
      startScreen: screen,
    };
  }
  return {
    draggedIndexes: new Set(),
    index: picked.index,
    nodeId: picked.node.id,
    link: null,
    lastWorld: world,
    moved: false,
    node: picked.node,
    startScreen: screen,
  };
}

function beginPrimaryPointerSession(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactPointerEvent<HTMLCanvasElement>,
  pointer: CanvasPointerGeometry,
): boolean {
  const layout = runtime.layoutRef.current;
  if (!layout) return false;
  const world = screenToWorld(runtime.cameraRef.current, pointer);
  const picked = pickNode(runtime, layout, world);
  const link = picked ? null : pickLink(runtime, layout, world)?.link ?? null;
  const session = createPointerSession(picked, link, world, pointer);
  runtime.pointerSessionRef.current = session;
  runtime.requestFrameRef.current();
  if (picked) event.currentTarget.setPointerCapture(event.pointerId);
  return true;
}

function beginPointerSession(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactPointerEvent<HTMLCanvasElement>,
): void {
  cancelOwnedGraphCameraTransition(runtime.cameraRef.current);
  const clearedHover = clearHoverForInteraction(runtime);
  const pointer = canvasPointerGeometry(event.currentTarget, event.nativeEvent);
  const contextButton = contextGestureButton(event);
  if (contextButton !== null) {
    beginContextGesture(runtime, event, pointer, contextButton);
  } else if (event.button === 0 && beginPrimaryPointerSession(runtime, event, pointer)) {
    return;
  }
  if (clearedHover) runtime.requestFrameRef.current();
}

function updateContextGesture(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactPointerEvent<HTMLCanvasElement>,
  screen: { x: number; y: number },
): boolean {
  const session = runtime.contextGestureSessionRef.current;
  if (!session || session.pointerId !== event.pointerId) return false;
  session.moved ||= movedPastThreshold(
    session.startScreen,
    screen,
    CONTEXT_GESTURE_DRAG_THRESHOLD_PX,
  );
  return true;
}

function moveDraggedNode(
  runtime: OwnedGraphInteractionRuntime,
  layout: OwnedGraphLayout,
  session: PointerSession | null,
  screen: { x: number; y: number },
  world: { x: number; y: number },
): boolean {
  if (session?.index === null || session?.index === undefined) return false;
  const node = layout.nodes[session.index];
  const translate = {
    x: world.x - session.lastWorld.x,
    y: world.y - session.lastWorld.y,
  };
  const crossedDragThreshold = movedPastThreshold(
    session.startScreen,
    screen,
    NODE_DRAG_THRESHOLD_PX,
  );
  if (!session.moved && !crossedDragThreshold) return true;
  if (!session.moved) {
    session.moved = true;
    layout.engine.pin(session.index);
    session.draggedIndexes.add(session.index);
    layout.engine.setAlphaTarget(0.3);
  }
  session.lastWorld = world;
  layout.engine.setNodePosition(session.index, world.x, world.y);
  runtime.positionVersionRef.current += 1;
  node.x = world.x;
  node.y = world.y;
  node.fx = world.x;
  node.fy = world.y;
  runtime.propsRef.current.sharedProps.onNodeDrag(node, translate);
  synchronizeOwnedDraggedNodes(layout, session.draggedIndexes);
  runtime.engineStopNotifiedRef.current = false;
  runtime.requestFrameRef.current();
  return true;
}

interface HoverTarget {
  link: FGLink | null;
  node: FGNode | null;
}

function resolveHoverTarget(
  runtime: OwnedGraphInteractionRuntime,
  layout: OwnedGraphLayout,
  world: { x: number; y: number },
): HoverTarget {
  const node = pickNode(runtime, layout, world)?.node ?? null;
  const link = node || !shouldEnableGraphEdgeHover(runtime.cameraRef.current.zoom)
    ? null
    : pickLink(runtime, layout, world)?.link ?? null;
  return { link, node };
}

function updateNodeHover(
  runtime: OwnedGraphInteractionRuntime,
  node: FGNode | null,
): boolean {
  if (node === runtime.hoveredNodeRef.current) return false;
  runtime.hoveredNodeRef.current = node;
  setOwnedGraphNodeHover(runtime.nodeHoverRef.current, node?.id ?? null, performance.now());
  runtime.propsRef.current.sharedProps.onNodeHover(node);
  return true;
}

function updateLinkHover(
  runtime: OwnedGraphInteractionRuntime,
  link: FGLink | null,
  screen: { x: number; y: number },
): boolean {
  if (link === runtime.hoveredLinkRef.current) return false;
  if (!link) runtime.clearLinkHover();
  else {
    runtime.hoveredLinkRef.current = link;
    runtime.setLinkTooltip({ link, screen });
  }
  return true;
}

function updateHover(
  runtime: OwnedGraphInteractionRuntime,
  layout: OwnedGraphLayout,
  world: { x: number; y: number },
  screen: { x: number; y: number },
): void {
  const { link, node } = resolveHoverTarget(runtime, layout, world);
  if (updateNodeHover(runtime, node)) runtime.requestFrameRef.current();
  if (updateLinkHover(runtime, link, screen)) {
    runtime.requestFrameRef.current();
    return;
  }
  if (link) {
    runtime.setLinkTooltip(current => current
      ? { ...current, screen }
      : { link, screen });
  }
}

function movePointerSession(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactPointerEvent<HTMLCanvasElement>,
): void {
  const pointer = canvasPointerGeometry(event.currentTarget, event.nativeEvent);
  if (updateContextGesture(runtime, event, pointer)) return;
  const layout = runtime.layoutRef.current;
  if (!layout) return;
  const world = screenToWorld(runtime.cameraRef.current, pointer);
  const session = runtime.pointerSessionRef.current;
  if (moveDraggedNode(runtime, layout, session, pointer, world)) return;
  if (session) {
    session.moved ||= movedPastThreshold(session.startScreen, pointer, NODE_DRAG_THRESHOLD_PX);
  }
  updateHover(runtime, layout, world, { x: pointer.x, y: pointer.y });
}

function releaseContextGestureCapture(
  canvas: HTMLCanvasElement,
  pointerId: number,
): void {
  if (canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId);
}

type ContextTarget =
  | { kind: 'background' }
  | { kind: 'link'; link: FGLink }
  | { kind: 'node'; node: FGNode };

function pickContextTarget(
  runtime: OwnedGraphInteractionRuntime,
  layout: OwnedGraphLayout,
  world: { x: number; y: number },
): ContextTarget {
  const node = pickNode(runtime, layout, world)?.node;
  if (node) return { kind: 'node', node };
  const link = pickLink(runtime, layout, world)?.link;
  return link ? { kind: 'link', link } : { kind: 'background' };
}

function routeRightClick(
  runtime: OwnedGraphInteractionRuntime,
  target: ContextTarget,
  event: MouseEvent,
): void {
  if (target.kind === 'node') {
    runtime.propsRef.current.sharedProps.onNodeRightClick(target.node, event);
  } else if (target.kind === 'link') {
    runtime.propsRef.current.sharedProps.onLinkRightClick(target.link, event);
  } else {
    runtime.propsRef.current.sharedProps.onBackgroundRightClick(event);
  }
}

function routeControlClick(
  runtime: OwnedGraphInteractionRuntime,
  target: ContextTarget,
  event: MouseEvent,
): void {
  if (target.kind === 'node') {
    runtime.propsRef.current.sharedProps.onNodeClick(target.node, event);
  } else if (target.kind === 'link') {
    runtime.propsRef.current.sharedProps.onLinkClick(target.link, event);
  } else {
    runtime.propsRef.current.sharedProps.onBackgroundClick(event);
  }
}

function routeContextGesture(
  runtime: OwnedGraphInteractionRuntime,
  session: ContextGestureSession,
  event: ReactPointerEvent<HTMLCanvasElement>,
): void {
  const layout = runtime.layoutRef.current;
  if (!layout || session.moved) return;
  const pointer = canvasPointerGeometry(event.currentTarget, event.nativeEvent);
  const world = screenToWorld(runtime.cameraRef.current, pointer);
  const target = pickContextTarget(runtime, layout, world);
  if (session.button === 2) routeRightClick(runtime, target, event.nativeEvent);
  else routeControlClick(runtime, target, event.nativeEvent);
}

function completeContextGesture(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactPointerEvent<HTMLCanvasElement>,
): boolean {
  const session = runtime.contextGestureSessionRef.current;
  if (!session || session.pointerId !== event.pointerId) return false;
  runtime.contextGestureSessionRef.current = null;
  releaseContextGestureCapture(event.currentTarget, event.pointerId);
  routeContextGesture(runtime, session, event);
  return true;
}

function releasePointerSession(
  runtime: OwnedGraphInteractionRuntime,
  layout: OwnedGraphLayout,
  session: PointerSession,
  canvas: HTMLCanvasElement,
  pointerId: number,
): void {
  releaseOwnedDraggedNodes(layout, session.draggedIndexes);
  if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
  layout.engine.setAlphaTarget(0);
  runtime.engineStopNotifiedRef.current = false;
  runtime.requestFrameRef.current();
}

function routeSurfaceClick(
  runtime: OwnedGraphInteractionRuntime,
  session: PointerSession,
  event: ReactPointerEvent<HTMLCanvasElement>,
): boolean {
  if (session.index !== null) return false;
  if (!session.moved && session.link) {
    runtime.propsRef.current.sharedProps.onLinkClick(session.link, event.nativeEvent);
  } else if (!session.moved) {
    runtime.propsRef.current.sharedProps.onBackgroundClick(event.nativeEvent);
  }
  return true;
}

function completeNodeSession(
  runtime: OwnedGraphInteractionRuntime,
  layout: OwnedGraphLayout,
  session: PointerSession,
  event: ReactPointerEvent<HTMLCanvasElement>,
): void {
  const node = layout.nodes[session.index as number];
  if (session.moved) runtime.propsRef.current.sharedProps.onNodeDragEnd(node);
  else runtime.propsRef.current.sharedProps.onNodeClick(node, event.nativeEvent);
  releasePointerSession(runtime, layout, session, event.currentTarget, event.pointerId);
}

function completePointerSession(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactPointerEvent<HTMLCanvasElement>,
): void {
  if (completeContextGesture(runtime, event)) return;
  const layout = runtime.layoutRef.current;
  const session = runtime.pointerSessionRef.current;
  runtime.pointerSessionRef.current = null;
  if (!layout || !session || routeSurfaceClick(runtime, session, event)) return;
  completeNodeSession(runtime, layout, session, event);
}

function cancelContextGesture(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactPointerEvent<HTMLCanvasElement>,
): boolean {
  const session = runtime.contextGestureSessionRef.current;
  if (!session || session.pointerId !== event.pointerId) return false;
  runtime.contextGestureSessionRef.current = null;
  releaseContextGestureCapture(event.currentTarget, event.pointerId);
  return true;
}

function notifyCancelledNodeDrag(
  runtime: OwnedGraphInteractionRuntime,
  layout: OwnedGraphLayout,
  session: PointerSession,
): void {
  if (session.index === null || !session.moved) return;
  const node = layout.nodes[session.index];
  if (node) runtime.propsRef.current.sharedProps.onNodeDragEnd(node);
}

function cancelPointerSession(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactPointerEvent<HTMLCanvasElement>,
): void {
  if (cancelContextGesture(runtime, event)) return;
  const layout = runtime.layoutRef.current;
  const session = runtime.pointerSessionRef.current;
  runtime.pointerSessionRef.current = null;
  if (!layout || !session) return;
  notifyCancelledNodeDrag(runtime, layout, session);
  releasePointerSession(runtime, layout, session, event.currentTarget, event.pointerId);
}

function suppressNativeContextMenu(
  event: ReactMouseEvent<HTMLCanvasElement>,
): void {
  event.preventDefault();
  event.stopPropagation();
}

function zoomAtPointer(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactWheelEvent<HTMLCanvasElement>,
): void {
  cancelOwnedGraphCameraTransition(runtime.cameraRef.current);
  const pointer = canvasPointerGeometry(event.currentTarget, event.nativeEvent);
  const world = screenToGraph(
    runtime.cameraRef.current,
    pointer.width,
    pointer.height,
    pointer.x,
    pointer.y,
  );
  const nextZoom = clampOwnedGraphZoom(
    runtime.cameraRef.current.zoom * Math.exp(-event.deltaY * 0.0015),
  );
  runtime.cameraRef.current.zoom = nextZoom;
  runtime.cameraRef.current.centerX = world.x
    - (pointer.x - pointer.width / 2) / nextZoom;
  runtime.cameraRef.current.centerY = world.y
    - (pointer.y - pointer.height / 2) / nextZoom;
  runtime.clearLinkHover();
  runtime.requestFrameRef.current();
}

function clearNodeHoverOnLeave(runtime: OwnedGraphInteractionRuntime): boolean {
  if (runtime.pointerSessionRef.current || !runtime.hoveredNodeRef.current) return false;
  runtime.hoveredNodeRef.current = null;
  setOwnedGraphNodeHover(runtime.nodeHoverRef.current, null, performance.now());
  runtime.propsRef.current.sharedProps.onNodeHover(null);
  return true;
}

function leavePointerSurface(runtime: OwnedGraphInteractionRuntime): void {
  if (clearNodeHoverOnLeave(runtime)) runtime.requestFrameRef.current();
  if (runtime.clearLinkHover()) runtime.requestFrameRef.current();
}

export function createOwnedGraphInteractionHandlers(
  runtime: OwnedGraphInteractionRuntime,
): OwnedGraphInteractionHandlers {
  return {
    handleContextMenu: suppressNativeContextMenu,
    handlePointerCancel: event => cancelPointerSession(runtime, event),
    handlePointerDown: event => beginPointerSession(runtime, event),
    handlePointerLeave: () => leavePointerSurface(runtime),
    handlePointerMove: event => movePointerSession(runtime, event),
    handlePointerUp: event => completePointerSession(runtime, event),
    handleWheel: event => zoomAtPointer(runtime, event),
  };
}
