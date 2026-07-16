import {
  useRef,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
} from 'react';
import type { MarqueePoint } from '../../../../marqueeSelection/model';
import { applyViewportPanDrag } from './coordinates';
import {
  canStartViewportPanDrag,
  clearViewportPanDrag,
  createViewportPanDragState,
  type GraphViewportPanRuntime,
  type GraphViewportPanRuntimeOptions,
  updateViewportPanDragState,
  type ViewportPanDragState,
} from './state';

function startViewportPanDrag(
  event: ReactMouseEvent<HTMLDivElement>,
  options: GraphViewportPanRuntimeOptions,
  panDragRef: MutableRefObject<ViewportPanDragState | null>,
): void {
  if (!canStartViewportPanDrag(event)) {
    clearViewportPanDrag(panDragRef);
    return;
  }

  event.preventDefault();
  panDragRef.current = createViewportPanDragState(
    event,
    options.fg2dRef.current,
    options.containerRef.current,
  );
}

function markRightClickPanMoved(options: GraphViewportPanRuntimeOptions): void {
  if (options.rightMouseDownRef.current) {
    options.rightMouseDownRef.current.moved = true;
  }
}

function applyViewportPanAfterThreshold(
  drag: ViewportPanDragState,
  current: MarqueePoint,
  event: ReactMouseEvent<HTMLDivElement>,
  options: GraphViewportPanRuntimeOptions,
): void {
  event.preventDefault();
  if (drag.suppressContextMenu) {
    options.suppressContextMenu();
  }
  if (drag.button === 2) {
    markRightClickPanMoved(options);
  }
  applyViewportPanDrag(drag, current, options.fg2dRef.current);
}

function moveViewportPanDrag(
  event: ReactMouseEvent<HTMLDivElement>,
  options: GraphViewportPanRuntimeOptions,
  panDragRef: MutableRefObject<ViewportPanDragState | null>,
): void {
  const drag = panDragRef.current;
  if (!drag) {
    return;
  }

  const current = { x: event.clientX, y: event.clientY };
  updateViewportPanDragState(drag, current);
  if (drag.moved) {
    applyViewportPanAfterThreshold(drag, current, event, options);
  }
}

function stopViewportPanDrag(
  event: ReactMouseEvent<HTMLDivElement>,
  panDragRef: MutableRefObject<ViewportPanDragState | null>,
): void {
  const drag = panDragRef.current;
  if (!drag || event.button !== drag.button) {
    return;
  }

  if (drag.moved) {
    event.preventDefault();
  }
  clearViewportPanDrag(panDragRef);
}

export function useGraphViewportPanRuntime(
  options: GraphViewportPanRuntimeOptions,
): GraphViewportPanRuntime {
  const panDragRef = useRef<ViewportPanDragState | null>(null);

  return {
    handleMouseDownCapture: (event) => startViewportPanDrag(event, options, panDragRef),
    handleMouseMoveCapture: (event) => moveViewportPanDrag(event, options, panDragRef),
    handleMouseUpCapture: (event) => stopViewportPanDrag(event, panDragRef),
  };
}
