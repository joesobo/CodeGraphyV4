import type { UseGraphInteractionRuntimeResult } from '../runtime/use/interaction';
import type { UseGraphStateResult } from '../runtime/use/state';
import type { GraphDebugControls } from './contracts';

export function buildGraphDebugOptions({
  graphMode,
  graphState,
  interactions,
  win,
}: {
  graphMode: '2d' | '3d';
  graphState: UseGraphStateResult;
  interactions: UseGraphInteractionRuntimeResult;
  win?: Window;
}): {
  containerRef: UseGraphStateResult['containerRef'];
  fitView(this: void): void;
  fg2dRef: { current: GraphDebugControls | undefined };
  fg3dRef: { current: GraphDebugControls | undefined };
  graphDataRef: UseGraphStateResult['graphDataRef'];
  graphMode: '2d' | '3d';
  win?: Window;
} {
  return {
    containerRef: graphState.containerRef,
    fitView: interactions.interactionHandlers.fitView,
    fg2dRef: graphState.fg2dRef,
    fg3dRef: graphState.fg3dRef,
    graphDataRef: graphState.graphDataRef,
    graphMode,
    win,
  };
}
