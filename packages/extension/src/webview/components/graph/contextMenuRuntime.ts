import {
  getGraphContextActionEffects,
  type GraphContextEffect,
} from '../graphContextActionEffects';
import {
  makeBackgroundContextSelection,
  type GraphContextMenuAction,
  type GraphContextSelection,
} from '../graphContextMenu';
import {
  shouldMarkRightMouseDrag,
  shouldUseRightClickFallback,
} from '../graphInteractionModel';
import {
  hideGraphTooltipState,
  type GraphTooltipState,
} from '../graphTooltipModel';
import { applyContextEffects as runContextEffects } from './effects/contextMenu';

const DEFAULT_RIGHT_CLICK_DRAG_THRESHOLD_PX = 6;
const DEFAULT_RIGHT_CLICK_FALLBACK_DELAY_MS = 40;
const DEFAULT_CONTEXT_SELECTION_GRACE_MS = 150;

export type GraphTimerHandle = ReturnType<typeof setTimeout>;

export interface GraphRef<TValue> {
  current: TValue;
}

export interface GraphRightMouseDownState {
  x: number;
  y: number;
  ctrlKey: boolean;
  moved: boolean;
}

export interface GraphRightClickPointerDownEvent {
  button: number;
  clientX: number;
  clientY: number;
  ctrlKey: boolean;
}

export interface GraphRightClickPointerMoveEvent {
  clientX: number;
  clientY: number;
}

export interface GraphRightClickPointerUpEvent {
  button: number;
}

export interface GraphContextMenuRuntimeDependencies<THoveredNode = unknown> {
  hoveredNodeRef: GraphRef<THoveredNode | null>;
  lastContainerContextMenuEventRef: GraphRef<number>;
  lastGraphContextEventRef: GraphRef<number>;
  rightClickFallbackTimerRef: GraphRef<GraphTimerHandle | null>;
  rightMouseDownRef: GraphRef<GraphRightMouseDownState | null>;
  tooltipTimeoutRef: GraphRef<GraphTimerHandle | null>;
  clearCachedFile(path: string): void;
  fitView(): void;
  focusNode(nodeId: string): void;
  openBackgroundContextMenu(event: MouseEvent): void;
  postMessage(message: { type: string; payload?: unknown }): void;
  setContextSelection(selection: GraphContextSelection): void;
  setTooltipData(updater: (previousState: GraphTooltipState) => GraphTooltipState): void;
  stopTooltipTracking(): void;
  now?(): number;
  fallbackDelayMs?: number;
  dragThresholdPx?: number;
  contextSelectionGraceMs?: number;
  scheduleFallback?(callback: () => void, delayMs: number): GraphTimerHandle;
  clearFallbackTimer?(handle: GraphTimerHandle): void;
}

export interface GraphContextMenuRuntime {
  clearRightClickFallbackTimer(): void;
  clearTooltipContext(): void;
  handleContextMenu(): void;
  handleMenuAction(action: GraphContextMenuAction, targetPaths: string[]): void;
  handleMouseDownCapture(event: GraphRightClickPointerDownEvent): void;
  handleMouseMoveCapture(event: GraphRightClickPointerMoveEvent): void;
  handleMouseUpCapture(event: GraphRightClickPointerUpEvent): void;
  applyContextEffects(effects: GraphContextEffect[]): void;
}

export function createGraphContextMenuRuntime(
  dependencies: GraphContextMenuRuntimeDependencies,
): GraphContextMenuRuntime {
  const now = (): number => (
    dependencies.now ? dependencies.now() : Date.now()
  );
  const dragThresholdPx =
    dependencies.dragThresholdPx ?? DEFAULT_RIGHT_CLICK_DRAG_THRESHOLD_PX;
  const fallbackDelayMs =
    dependencies.fallbackDelayMs ?? DEFAULT_RIGHT_CLICK_FALLBACK_DELAY_MS;
  const contextSelectionGraceMs =
    dependencies.contextSelectionGraceMs ?? DEFAULT_CONTEXT_SELECTION_GRACE_MS;
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

  const clearTooltipContext = (): void => {
    if (dependencies.tooltipTimeoutRef.current !== null) {
      clearTimeout(dependencies.tooltipTimeoutRef.current);
      dependencies.tooltipTimeoutRef.current = null;
    }

    dependencies.hoveredNodeRef.current = null;
    dependencies.stopTooltipTracking();
    dependencies.setTooltipData(hideGraphTooltipState);
  };

  const applyContextEffects = (effects: GraphContextEffect[]): void => {
    runContextEffects(effects, {
      clearCachedFile: (path) => dependencies.clearCachedFile(path),
      fitView: () => dependencies.fitView(),
      focusNode: (nodeId) => dependencies.focusNode(nodeId),
      postMessage: (message) => dependencies.postMessage(message),
    });
  };

  const handleMenuAction = (
    action: GraphContextMenuAction,
    targetPaths: string[],
  ): void => {
    applyContextEffects(getGraphContextActionEffects(action, targetPaths));
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

  const handleContextMenu = (): void => {
    dependencies.lastContainerContextMenuEventRef.current = now();

    if (
      now() - dependencies.lastGraphContextEventRef.current
      > contextSelectionGraceMs
    ) {
      dependencies.setContextSelection(makeBackgroundContextSelection());
    }

    clearTooltipContext();
  };

  return {
    clearRightClickFallbackTimer,
    clearTooltipContext,
    handleContextMenu,
    handleMenuAction,
    handleMouseDownCapture,
    handleMouseMoveCapture,
    handleMouseUpCapture,
    applyContextEffects,
  };
}
