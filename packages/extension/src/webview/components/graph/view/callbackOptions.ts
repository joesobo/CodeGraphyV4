import type { WebviewPluginHost } from '../../../pluginHost/manager';
import type { UseGraphCallbacksOptions } from '../rendering/useGraphCallbacks';
import type { GraphRuntime } from '../runtime/use/state';

export function buildGraphCallbackOptions({
  graphState,
  pluginHost,
}: {
  graphState: GraphRuntime;
  pluginHost?: WebviewPluginHost;
}): UseGraphCallbacksOptions {
  return {
    pluginHost,
    refs: {
      directionColorRef: graphState.directionColorRef,
      directionModeRef: graphState.directionModeRef,
      edgeDecorationsRef: graphState.edgeDecorationsRef,
      graphAppearanceRef: graphState.graphAppearanceRef,
      highlightedNeighborsRef: graphState.highlightedNeighborsRef,
      highlightedNodeRef: graphState.highlightedNodeRef,
      nodeDecorationsRef: graphState.nodeDecorationsRef,
      selectedNodesSetRef: graphState.selection.selectedNodeIdsRef,
      showLabelsRef: graphState.showLabelsRef,
      themeRef: graphState.themeRef,
    },
    triggerImageRerender: graphState.renderCaches.invalidateImages,
  };
}
