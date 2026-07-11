import type { UseGraphInteractionRuntimeResult } from '../runtime/use/interaction';
import type { GraphRuntime } from '../runtime/use/state';
import type { GraphDebugControls } from './contracts/protocol';

export function buildGraphDebugOptions({
  graphState,
  interactions,
  win,
}: {
  graphState: GraphRuntime;
  interactions: UseGraphInteractionRuntimeResult;
  win?: Window;
}): {
  containerRef: GraphRuntime['renderer']['containerRef'];
  fitView(this: void): void;
  fg2dRef: { current: GraphDebugControls | undefined };
  graphDataRef: GraphRuntime['renderer']['graphDataRef'];
  openNodeContextMenu: UseGraphInteractionRuntimeResult['handleNodeContextMenuById'];
  win?: Window;
} {
  return {
    containerRef: graphState.renderer.containerRef,
    fitView: interactions.interactionHandlers.fitView,
    fg2dRef: graphState.renderer.fg2dRef,
    graphDataRef: graphState.renderer.graphDataRef,
    openNodeContextMenu: interactions.handleNodeContextMenuById,
    win,
  };
}
