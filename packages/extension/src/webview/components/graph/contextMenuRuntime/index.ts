import {
  type GraphContextEffect,
} from '../../graphContextActionEffects';
import type {
  GraphContextMenuAction,
  GraphContextSelection,
} from '../../graphContextMenu';
import type { GraphTooltipState } from '../../graphTooltipModel';
import { createContextMenuEffectRuntime } from './effects';
import { createContextMenuPointerRuntime } from './pointer';
import { createContextMenuTooltipRuntime } from './tooltip';

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
  const effectRuntime = createContextMenuEffectRuntime(dependencies);
  const pointerRuntime = createContextMenuPointerRuntime(dependencies);
  const tooltipRuntime = createContextMenuTooltipRuntime(dependencies);

  return {
    clearRightClickFallbackTimer: () => pointerRuntime.clearRightClickFallbackTimer(),
    clearTooltipContext: () => tooltipRuntime.clearTooltipContext(),
    handleContextMenu: () => tooltipRuntime.handleContextMenu(),
    handleMenuAction: (action, targetPaths) =>
      effectRuntime.handleMenuAction(action, targetPaths),
    handleMouseDownCapture: (event) => pointerRuntime.handleMouseDownCapture(event),
    handleMouseMoveCapture: (event) => pointerRuntime.handleMouseMoveCapture(event),
    handleMouseUpCapture: (event) => pointerRuntime.handleMouseUpCapture(event),
    applyContextEffects: (effects) => effectRuntime.applyContextEffects(effects),
  };
}
