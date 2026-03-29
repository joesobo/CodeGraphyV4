import { makeBackgroundContextSelection } from '../contextMenu/selection';
import { hideGraphTooltipState } from '../tooltipModel';
import type { GraphContextMenuRuntimeDependencies } from './controller';

const DEFAULT_CONTEXT_SELECTION_GRACE_MS = 150;

type GraphContextMenuTooltipDependencies = Pick<
  GraphContextMenuRuntimeDependencies,
  | 'hoveredNodeRef'
  | 'lastContainerContextMenuEventRef'
  | 'lastGraphContextEventRef'
  | 'tooltipTimeoutRef'
  | 'setContextSelection'
  | 'setTooltipData'
  | 'stopTooltipTracking'
> & Partial<Pick<
  GraphContextMenuRuntimeDependencies,
  | 'now'
  | 'contextSelectionGraceMs'
>>;

export interface GraphContextMenuTooltipRuntime {
  clearTooltipContext(): void;
  handleContextMenu(): void;
}

export function createContextMenuTooltipRuntime(
  dependencies: GraphContextMenuTooltipDependencies,
): GraphContextMenuTooltipRuntime {
  const now = (): number => (
    dependencies.now ? dependencies.now() : Date.now()
  );
  const contextSelectionGraceMs =
    dependencies.contextSelectionGraceMs ?? DEFAULT_CONTEXT_SELECTION_GRACE_MS;

  const clearTooltipContext = (): void => {
    if (dependencies.tooltipTimeoutRef.current !== null) {
      clearTimeout(dependencies.tooltipTimeoutRef.current);
      dependencies.tooltipTimeoutRef.current = null;
    }

    dependencies.hoveredNodeRef.current = null;
    dependencies.stopTooltipTracking();
    dependencies.setTooltipData(hideGraphTooltipState);
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
    clearTooltipContext,
    handleContextMenu,
  };
}
