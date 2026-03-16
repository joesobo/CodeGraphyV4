import { shouldUseRightClickFallback } from '../graphInteractionModel';
import { createFallbackContextMenuEvent } from './contextMenuRuntimeFallbackEvent';
import type {
  GraphContextMenuRuntimeDependencies,
  GraphRightMouseDownState,
  GraphTimerHandle,
} from './contextMenuRuntime';

const DEFAULT_RIGHT_CLICK_FALLBACK_DELAY_MS = 40;

type GraphContextMenuFallbackDependencies = Pick<
  GraphContextMenuRuntimeDependencies,
  | 'lastContainerContextMenuEventRef'
  | 'lastGraphContextEventRef'
  | 'rightClickFallbackTimerRef'
  | 'openBackgroundContextMenu'
  | 'now'
  | 'fallbackDelayMs'
  | 'scheduleFallback'
  | 'clearFallbackTimer'
>;

export interface GraphContextMenuFallbackRuntime {
  clearRightClickFallbackTimer(): void;
  scheduleRightClickFallback(rightMouseDown: GraphRightMouseDownState): void;
}

export function createContextMenuFallbackRuntime(
  dependencies: GraphContextMenuFallbackDependencies,
): GraphContextMenuFallbackRuntime {
  const now = (): number => (
    dependencies.now ? dependencies.now() : Date.now()
  );
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

  const scheduleRightClickFallback = (
    rightMouseDown: GraphRightMouseDownState,
  ): void => {
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

      dependencies.openBackgroundContextMenu(
        createFallbackContextMenuEvent(
          rightMouseDown.x,
          rightMouseDown.y,
          rightMouseDown.ctrlKey,
        ),
      );
    }, fallbackDelayMs);
  };

  return {
    clearRightClickFallbackTimer,
    scheduleRightClickFallback,
  };
}
