import type { WebviewPluginHost } from '../../pluginHost/manager';
import type { UseGraphCallbacksOptions } from './rendering/useGraphCallbacks';
import type { UseGraphStateResult } from './runtime/use/graph/state';

export function buildGraphCallbackOptions({
  graphState,
  pluginHost,
}: {
  graphState: UseGraphStateResult;
  pluginHost?: WebviewPluginHost;
}): UseGraphCallbacksOptions {
  return {
    pluginHost,
    refs: {
      directionColorRef: graphState.directionColorRef,
      directionModeRef: graphState.directionModeRef,
      edgeDecorationsRef: graphState.edgeDecorationsRef,
      highlightedNeighborsRef: graphState.highlightedNeighborsRef,
      highlightedNodeRef: graphState.highlightedNodeRef,
      meshesRef: graphState.meshesRef,
      nodeDecorationsRef: graphState.nodeDecorationsRef,
      selectedNodesSetRef: graphState.selectedNodesSetRef,
      showLabelsRef: graphState.showLabelsRef,
      spritesRef: graphState.spritesRef,
      themeRef: graphState.themeRef,
    },
    triggerImageRerender: graphState.triggerImageRerender,
  };
}
