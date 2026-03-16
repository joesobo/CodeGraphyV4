import type {
  GraphRightClickFallbackOptions,
  GraphRightMouseDragOptions,
} from '../graphInteractionModel';

export function shouldMarkRightMouseDrag(
  options: GraphRightMouseDragOptions,
): boolean {
  const dx = options.nextX - options.startX;
  const dy = options.nextY - options.startY;

  return (dx * dx) + (dy * dy) > (options.thresholdPx * options.thresholdPx);
}

export function shouldUseRightClickFallback(
  options: GraphRightClickFallbackOptions,
): boolean {
  const recentWindow = options.fallbackDelayMs * 3;
  const graphCallbackHandledRecently =
    options.now - options.lastGraphContextEvent <= recentWindow;
  const contextMenuHandledRecently =
    options.now - options.lastContainerContextMenuEvent <= recentWindow;

  return !graphCallbackHandledRecently && !contextMenuHandledRecently;
}
