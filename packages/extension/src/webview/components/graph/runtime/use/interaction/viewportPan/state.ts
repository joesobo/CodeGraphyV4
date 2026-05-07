import type {
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
} from 'react';
import type { GraphLayoutMode } from '../../../../../../../shared/settings/graphLayout';
import {
  isMarqueePastThreshold,
  type MarqueePoint,
} from '../../../../marqueeSelection/model';
import type { UseGraphStateResult } from '../../state';
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
  zoom: number;
}

export interface GraphViewportPanRuntimeOptions {
  containerRef: UseGraphStateResult['containerRef'];
  fg2dRef: UseGraphStateResult['fg2dRef'];
  graphMode: GraphLayoutMode;
  rightMouseDownRef: UseGraphStateResult['rightMouseDownRef'];
  suppressContextMenu(this: void): void;
}

export interface GraphViewportPanRuntime {
  handleMouseDownCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleMouseMoveCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleMouseUpCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
}

function isViewportPanButton(button: number): boolean {
  return button === 1 || button === 2;
}

export function createViewportPanDragState(
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
  options: GraphViewportPanRuntimeOptions,
): boolean {
  return options.graphMode === '2d' && isViewportPanButton(event.button);
}
