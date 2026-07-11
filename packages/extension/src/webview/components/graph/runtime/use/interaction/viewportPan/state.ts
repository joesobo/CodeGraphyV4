import type {
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
} from 'react';
import {
  isMarqueePastThreshold,
  type MarqueePoint,
} from '../../../../marqueeSelection/model';
import type { GraphRuntime } from '../../state';
import {
  readViewportPanCenter,
  readViewportPanZoom,
} from './coordinates';

export const VIEWPORT_PAN_DRAG_THRESHOLD_PX = 2;

export interface ViewportPanDragState {
  button: number;
  center: { x: number; y: number };
  moved: boolean;
  start: MarqueePoint;
  suppressContextMenu: boolean;
  zoom: number;
}

export interface GraphViewportPanRuntimeOptions {
  containerRef: GraphRuntime['renderer']['containerRef'];
  fg2dRef: GraphRuntime['renderer']['fg2dRef'];
  rightMouseDownRef: GraphRuntime['context']['rightMouseDownRef'];
  suppressContextMenu(this: void): void;
}

export interface GraphViewportPanRuntime {
  handleMouseDownCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleMouseMoveCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleMouseUpCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
}

function isViewportPanButton(event: ReactMouseEvent<HTMLDivElement>): boolean {
  return event.button === 1
    || event.button === 2
    || (event.button === 0 && event.ctrlKey);
}

export function createViewportPanDragState(
  event: ReactMouseEvent<HTMLDivElement>,
  graph: GraphRuntime['renderer']['fg2dRef']['current'],
  container: HTMLDivElement | null,
): ViewportPanDragState {
  return {
    button: event.button,
    center: readViewportPanCenter(graph, container),
    moved: false,
    start: { x: event.clientX, y: event.clientY },
    suppressContextMenu: event.button === 2 || (event.button === 0 && event.ctrlKey),
    zoom: readViewportPanZoom(graph),
  };
}

export function updateViewportPanDragState(
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

export function clearViewportPanDrag(
  panDragRef: MutableRefObject<ViewportPanDragState | null>,
): void {
  panDragRef.current = null;
}

export function canStartViewportPanDrag(
  event: ReactMouseEvent<HTMLDivElement>,
): boolean {
  return isViewportPanButton(event);
}
