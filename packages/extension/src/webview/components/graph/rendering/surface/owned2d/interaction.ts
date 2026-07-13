import type {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  SetStateAction,
  WheelEvent as ReactWheelEvent,
} from 'react';
import type { FGLink, FGNode } from '../../../model/build';
import { clampOwnedGraphZoom, screenToGraph, type OwnedGraphCamera } from './camera';
import { canvasSize, localCanvasPointer } from './canvasGeometry';
import type { Surface2dProps } from './contracts';
import { releaseOwnedDraggedNodes, synchronizeOwnedDraggedNodes } from './drag';
import type { OwnedGraphLayout } from './layout';
import { pickOwnedGraphLink } from './linkPicking';
import type { OwnedGraphNodePicker } from './picking';

export interface CtrlClickSession {
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
  ctrlClickSessionRef: MutableRefObject<CtrlClickSession | null>;
  engineStopNotifiedRef: MutableRefObject<boolean>;
  hoveredLinkRef: MutableRefObject<FGLink | null>;
  hoveredNodeRef: MutableRefObject<FGNode | null>;
  layoutRef: MutableRefObject<OwnedGraphLayout | null>;
  pickerPositionVersionRef: MutableRefObject<number>;
  pickerRef: MutableRefObject<OwnedGraphNodePicker>;
  pointerSessionRef: MutableRefObject<PointerSession | null>;
  positionVersionRef: MutableRefObject<number>;
  propsRef: MutableRefObject<Surface2dProps>;
  requestFrameRef: MutableRefObject<() => void>;
  setLinkTooltip: Dispatch<SetStateAction<LinkTooltip | null>>;
  skipPhysicsFrameRef: MutableRefObject<boolean>;
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

const CTRL_PAN_DRAG_THRESHOLD_PX = 2;
const NODE_DRAG_THRESHOLD_PX = 3;

function screenToWorld(
  camera: OwnedGraphCamera,
  canvas: HTMLCanvasElement,
  screen: { x: number; y: number },
): { x: number; y: number } {
  const size = canvasSize(canvas);
  return screenToGraph(camera, size.width, size.height, screen.x, screen.y);
}

function pickNode(
  runtime: OwnedGraphInteractionRuntime,
  layout: OwnedGraphLayout,
  world: { x: number; y: number },
) {
  if (runtime.pickerPositionVersionRef.current !== runtime.positionVersionRef.current) {
    runtime.pickerRef.current.rebuild(layout.nodes);
    runtime.pickerPositionVersionRef.current = runtime.positionVersionRef.current;
  }
  return runtime.pickerRef.current.pick(world, runtime.cameraRef.current.zoom);
}

function movedPastThreshold(
  start: { x: number; y: number },
  current: { x: number; y: number },
  threshold: number,
): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) > threshold;
}

function beginPointerSession(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactPointerEvent<HTMLCanvasElement>,
): void {
  if (event.button !== 0) return;
  const screen = localCanvasPointer(event.currentTarget, event.nativeEvent);
  if (event.ctrlKey) {
    runtime.ctrlClickSessionRef.current = {
      moved: false,
      pointerId: event.pointerId,
      startScreen: screen,
    };
    return;
  }
  const layout = runtime.layoutRef.current;
  if (!layout) return;
  const world = screenToWorld(runtime.cameraRef.current, event.currentTarget, screen);
  const picked = pickNode(runtime, layout, world);
  const pickedLink = picked
    ? undefined
    : pickOwnedGraphLink(layout.links, world, runtime.cameraRef.current.zoom);
  runtime.pointerSessionRef.current = {
    draggedIndexes: new Set(picked ? [picked.index] : []),
    index: picked?.index ?? null,
    nodeId: picked?.node.id ?? null,
    link: pickedLink?.link ?? null,
    lastWorld: world,
    moved: false,
    node: picked?.node ?? null,
    startScreen: screen,
  };
  if (!picked) return;
  layout.engine.pin(picked.index);
  picked.node.fx = picked.node.x;
  picked.node.fy = picked.node.y;
  event.currentTarget.setPointerCapture(event.pointerId);
}

function updateCtrlGesture(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactPointerEvent<HTMLCanvasElement>,
  screen: { x: number; y: number },
): boolean {
  const session = runtime.ctrlClickSessionRef.current;
  if (!session || session.pointerId !== event.pointerId) return false;
  session.moved ||= movedPastThreshold(
    session.startScreen,
    screen,
    CTRL_PAN_DRAG_THRESHOLD_PX,
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
    layout.engine.setAlphaTarget(0.3);
  }
  session.lastWorld = world;
  layout.engine.setNodePosition(session.index, world.x, world.y);
  runtime.positionVersionRef.current += 1;
  layout.engine.pin(session.index);
  node.x = world.x;
  node.y = world.y;
  node.fx = world.x;
  node.fy = world.y;
  runtime.propsRef.current.sharedProps.onNodeDrag?.(node, translate);
  synchronizeOwnedDraggedNodes(layout, session.draggedIndexes);
  runtime.engineStopNotifiedRef.current = false;
  runtime.requestFrameRef.current();
  return true;
}

function updateHover(
  runtime: OwnedGraphInteractionRuntime,
  layout: OwnedGraphLayout,
  world: { x: number; y: number },
  screen: { x: number; y: number },
): void {
  const hovered = pickNode(runtime, layout, world)?.node ?? null;
  const hoveredLink = hovered
    ? null
    : pickOwnedGraphLink(layout.links, world, runtime.cameraRef.current.zoom)?.link ?? null;
  if (hovered !== runtime.hoveredNodeRef.current) {
    runtime.hoveredNodeRef.current = hovered;
    runtime.propsRef.current.sharedProps.onNodeHover(hovered);
    runtime.requestFrameRef.current();
  }
  if (hoveredLink !== runtime.hoveredLinkRef.current) {
    runtime.hoveredLinkRef.current = hoveredLink;
    runtime.setLinkTooltip(hoveredLink ? { link: hoveredLink, screen } : null);
    return;
  }
  if (hoveredLink) {
    runtime.setLinkTooltip(current => current
      ? { ...current, screen }
      : { link: hoveredLink, screen });
  }
}

function movePointerSession(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactPointerEvent<HTMLCanvasElement>,
): void {
  const screen = localCanvasPointer(event.currentTarget, event.nativeEvent);
  if (updateCtrlGesture(runtime, event, screen)) return;
  const layout = runtime.layoutRef.current;
  if (!layout) return;
  const world = screenToWorld(runtime.cameraRef.current, event.currentTarget, screen);
  const session = runtime.pointerSessionRef.current;
  if (moveDraggedNode(runtime, layout, session, screen, world)) return;
  if (session) {
    session.moved ||= movedPastThreshold(session.startScreen, screen, NODE_DRAG_THRESHOLD_PX);
  }
  updateHover(runtime, layout, world, screen);
}

function completeCtrlClick(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactPointerEvent<HTMLCanvasElement>,
): boolean {
  const session = runtime.ctrlClickSessionRef.current;
  if (!session || session.pointerId !== event.pointerId) return false;
  runtime.ctrlClickSessionRef.current = null;
  const layout = runtime.layoutRef.current;
  if (!layout || session.moved) return true;
  const screen = localCanvasPointer(event.currentTarget, event.nativeEvent);
  const world = screenToWorld(runtime.cameraRef.current, event.currentTarget, screen);
  const node = pickNode(runtime, layout, world)?.node;
  if (node) runtime.propsRef.current.sharedProps.onNodeClick(node, event.nativeEvent);
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
  if (session.moved) runtime.propsRef.current.sharedProps.onNodeDragEnd?.(node);
  else runtime.propsRef.current.sharedProps.onNodeClick(node, event.nativeEvent);
  releasePointerSession(runtime, layout, session, event.currentTarget, event.pointerId);
}

function completePointerSession(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactPointerEvent<HTMLCanvasElement>,
): void {
  if (completeCtrlClick(runtime, event)) return;
  const layout = runtime.layoutRef.current;
  const session = runtime.pointerSessionRef.current;
  runtime.pointerSessionRef.current = null;
  if (!layout || !session || routeSurfaceClick(runtime, session, event)) return;
  completeNodeSession(runtime, layout, session, event);
}

function cancelCtrlGesture(
  runtime: OwnedGraphInteractionRuntime,
  pointerId: number,
): boolean {
  const session = runtime.ctrlClickSessionRef.current;
  if (!session || session.pointerId !== pointerId) return false;
  runtime.ctrlClickSessionRef.current = null;
  return true;
}

function cancelPointerSession(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactPointerEvent<HTMLCanvasElement>,
): void {
  if (cancelCtrlGesture(runtime, event.pointerId)) return;
  const layout = runtime.layoutRef.current;
  const session = runtime.pointerSessionRef.current;
  runtime.pointerSessionRef.current = null;
  if (!layout || !session) return;
  if (session.index !== null && session.moved) {
    const node = layout.nodes[session.index];
    if (node) runtime.propsRef.current.sharedProps.onNodeDragEnd?.(node);
  }
  releasePointerSession(runtime, layout, session, event.currentTarget, event.pointerId);
}

function openContextMenu(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactMouseEvent<HTMLCanvasElement>,
): void {
  const layout = runtime.layoutRef.current;
  if (!layout) return;
  event.preventDefault();
  const screen = localCanvasPointer(event.currentTarget, event.nativeEvent);
  const world = screenToWorld(runtime.cameraRef.current, event.currentTarget, screen);
  const node = pickNode(runtime, layout, world)?.node;
  if (node) {
    runtime.propsRef.current.sharedProps.onNodeRightClick(node, event.nativeEvent);
    return;
  }
  const link = pickOwnedGraphLink(layout.links, world, runtime.cameraRef.current.zoom)?.link;
  if (link) runtime.propsRef.current.sharedProps.onLinkRightClick(link, event.nativeEvent);
  else runtime.propsRef.current.sharedProps.onBackgroundRightClick(event.nativeEvent);
}

function zoomAtPointer(
  runtime: OwnedGraphInteractionRuntime,
  event: ReactWheelEvent<HTMLCanvasElement>,
): void {
  const canvas = event.currentTarget;
  const size = canvasSize(canvas);
  const screen = localCanvasPointer(canvas, event.nativeEvent);
  const world = screenToGraph(
    runtime.cameraRef.current,
    size.width,
    size.height,
    screen.x,
    screen.y,
  );
  const nextZoom = clampOwnedGraphZoom(
    runtime.cameraRef.current.zoom * Math.exp(-event.deltaY * 0.0015),
  );
  runtime.cameraRef.current.zoom = nextZoom;
  runtime.cameraRef.current.centerX = world.x - (screen.x - size.width / 2) / nextZoom;
  runtime.cameraRef.current.centerY = world.y - (screen.y - size.height / 2) / nextZoom;
  runtime.skipPhysicsFrameRef.current = true;
  runtime.requestFrameRef.current();
}

function leavePointerSurface(runtime: OwnedGraphInteractionRuntime): void {
  if (!runtime.pointerSessionRef.current && runtime.hoveredNodeRef.current) {
    runtime.hoveredNodeRef.current = null;
    runtime.propsRef.current.sharedProps.onNodeHover(null);
    runtime.requestFrameRef.current();
  }
  runtime.hoveredLinkRef.current = null;
  runtime.setLinkTooltip(null);
}

export function createOwnedGraphInteractionHandlers(
  runtime: OwnedGraphInteractionRuntime,
): OwnedGraphInteractionHandlers {
  return {
    handleContextMenu: event => openContextMenu(runtime, event),
    handlePointerCancel: event => cancelPointerSession(runtime, event),
    handlePointerDown: event => beginPointerSession(runtime, event),
    handlePointerLeave: () => leavePointerSurface(runtime),
    handlePointerMove: event => movePointerSession(runtime, event),
    handlePointerUp: event => completePointerSession(runtime, event),
    handleWheel: event => zoomAtPointer(runtime, event),
  };
}
