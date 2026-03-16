import {
  shouldMarkRightMouseDrag,
  shouldUseRightClickFallback,
} from '../graphInteractionModel';
import type {
  GraphContextMenuRuntimeDependencies,
  GraphRightClickPointerDownEvent,
  GraphRightClickPointerMoveEvent,
  GraphRightClickPointerUpEvent,
  GraphTimerHandle,
} from './contextMenuRuntime';

const DEFAULT_RIGHT_CLICK_DRAG_THRESHOLD_PX = 6;
const DEFAULT_RIGHT_CLICK_FALLBACK_DELAY_MS = 40;

type GraphContextMenuPointerDependencies = Pick<
  GraphContextMenuRuntimeDependencies,
  | 'lastContainerContextMenuEventRef'
  | 'lastGraphContextEventRef'
  | 'rightClickFallbackTimerRef'
  | 'rightMouseDownRef'
  | 'openBackgroundContextMenu'
  | 'now'
  | 'fallbackDelayMs'
  | 'dragThresholdPx'
  | 'scheduleFallback'
  | 'clearFallbackTimer'
>;

export interface GraphContextMenuPointerRuntime {
  clearRightClickFallbackTimer(): void;
  handleMouseDownCapture(event: GraphRightClickPointerDownEvent): void;
  handleMouseMoveCapture(event: GraphRightClickPointerMoveEvent): void;
  handleMouseUpCapture(event: GraphRightClickPointerUpEvent): void;
}

export function createContextMenuPointerRuntime(
  dependencies: GraphContextMenuPointerDependencies,
): GraphContextMenuPointerRuntime {
  const now = (): number => (
    dependencies.now ? dependencies.now() : Date.now()
  );
  const dragThresholdPx =
    dependencies.dragThresholdPx ?? DEFAULT_RIGHT_CLICK_DRAG_THRESHOLD_PX;
  const fallbackDelayMs =
    dependencies.fallbackDelayMs ?? DEFAULT_RIGHT_CLICK_FALLBACK_DELAY_MS;

  const scheduleFallback = (
    callback: () => void,
    delayMs: number,
  ): GraphTimerHandle => (
    dependencies.scheduleFallback
      ? dependencies.scheduleFallback(callback, delayMs)
      : setTimeout(callback, delayMs)
  );

  const clearFallbackTimer = (handle: GraphTimerHandle): void => {
    if (dependencies.clearFallbackTimer) {
      dependencies.clearFallbackTimer(handle);
      return;
    }

    clearTimeout(handle);
  };

  const clearRightClickFallbackTimer = (): void => {
    if (dependencies.rightClickFallbackTimerRef.current === null) {
      return;
    }

    clearFallbackTimer(dependencies.rightClickFallbackTimerRef.current);
    dependencies.rightClickFallbackTimerRef.current = null;
  };

  const handleMouseDownCapture = (
    event: GraphRightClickPointerDownEvent,
  ): void => {
    if (event.button !== 2) {
      return;
    }

    clearRightClickFallbackTimer();
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

    clearRightClickFallbackTimer();
    dependencies.rightClickFallbackTimerRef.current = scheduleFallback(() => {
      const currentTime = now();
      if (!shouldUseRightClickFallback({
        now: currentTime,
        lastGraphContextEvent: dependencies.lastGraphContextEventRef.current,
        lastContainerContextMenuEvent: dependencies.lastContainerContextMenuEventRef.current,
        fallbackDelayMs,
      })) {
        return;
      }

      dependencies.openBackgroundContextMenu(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2,
        buttons: 2,
        clientX: rightMouseDown.x,
        clientY: rightMouseDown.y,
        ctrlKey: rightMouseDown.ctrlKey,
      }));
    }, fallbackDelayMs);
  };

  return {
    clearRightClickFallbackTimer,
    handleMouseDownCapture,
    handleMouseMoveCapture,
    handleMouseUpCapture,
  };
}
