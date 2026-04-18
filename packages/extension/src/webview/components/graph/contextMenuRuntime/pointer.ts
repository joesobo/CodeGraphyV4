import {
  shouldMarkRightMouseDrag,
} from '../interaction/model';
import type {
  GraphContextMenuRuntimeDependencies,
  GraphRightClickPointerDownEvent,
  GraphRightClickPointerMoveEvent,
  GraphRightClickPointerUpEvent,
} from './controller';
import { createContextMenuFallbackRuntime } from './fallback/scheduler';

const DEFAULT_RIGHT_CLICK_DRAG_THRESHOLD_PX = 6;

type GraphContextMenuPointerDependencies = Pick<
  GraphContextMenuRuntimeDependencies,
  | 'lastContainerContextMenuEventRef'
  | 'lastGraphContextEventRef'
  | 'rightClickFallbackTimerRef'
  | 'rightMouseDownRef'
  | 'openBackgroundContextMenu'
> & Partial<Pick<
  GraphContextMenuRuntimeDependencies,
  | 'now'
  | 'dragThresholdPx'
  | 'scheduleFallback'
  | 'clearFallbackTimer'
>>;

export interface GraphContextMenuPointerRuntime {
  clearRightClickFallbackTimer(): void;
  handleMouseDownCapture(event: GraphRightClickPointerDownEvent): void;
  handleMouseMoveCapture(event: GraphRightClickPointerMoveEvent): void;
  handleMouseUpCapture(event: GraphRightClickPointerUpEvent): void;
}

export function createContextMenuPointerRuntime(
  dependencies: GraphContextMenuPointerDependencies,
): GraphContextMenuPointerRuntime {
  const dragThresholdPx =
    dependencies.dragThresholdPx ?? DEFAULT_RIGHT_CLICK_DRAG_THRESHOLD_PX;
  const fallbackRuntime = createContextMenuFallbackRuntime(dependencies);

  const handleMouseDownCapture = (
    event: GraphRightClickPointerDownEvent,
  ): void => {
    if (event.button !== 2) {
      return;
    }

    fallbackRuntime.clearRightClickFallbackTimer();
    dependencies.rightMouseDownRef.current = {
      x: event.clientX,
      y: event.clientY,
      ctrlKey: event.ctrlKey,
      moved: false,
    };
  };

  const handleMouseMoveCapture = (
    event: GraphRightClickPointerMoveEvent,
  ): void => {
    const rightMouseDown = dependencies.rightMouseDownRef.current;
    if (!rightMouseDown) {
      return;
    }

    if (shouldMarkRightMouseDrag({
      startX: rightMouseDown.x,
      startY: rightMouseDown.y,
      nextX: event.clientX,
      nextY: event.clientY,
      thresholdPx: dragThresholdPx,
    })) {
      rightMouseDown.moved = true;
    }
  };

  const handleMouseUpCapture = (
    event: GraphRightClickPointerUpEvent,
  ): void => {
    if (event.button !== 2) {
      return;
    }

    const rightMouseDown = dependencies.rightMouseDownRef.current;
    dependencies.rightMouseDownRef.current = null;
    if (!rightMouseDown || rightMouseDown.moved) {
      return;
    }

    fallbackRuntime.scheduleRightClickFallback(rightMouseDown);
  };

  return {
    clearRightClickFallbackTimer: () => {
      fallbackRuntime.clearRightClickFallbackTimer();
    },
    handleMouseDownCapture,
    handleMouseMoveCapture,
    handleMouseUpCapture,
  };
}
