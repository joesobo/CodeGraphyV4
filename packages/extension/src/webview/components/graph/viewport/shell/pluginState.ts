import type { WebviewPluginHost } from '../../../../pluginHost/manager';
import type { GraphViewStoreState } from '../../view/store';
import type { FGNode } from '../../model/build';
import { createGraphViewViewportState, type GraphViewport2dControls } from './state';

export function publishPluginGraphViewViewportState({
  globalScale,
  graph,
  graphMode,
  nodes,
  pluginHost,
  timelineActive,
}: {
  globalScale: number;
  graph: GraphViewport2dControls | undefined;
  graphMode: GraphViewStoreState['graphMode'];
  nodes: readonly FGNode[];
  pluginHost: WebviewPluginHost | undefined;
  timelineActive: boolean;
}): void {
  if (!pluginHost || pluginHost.hasGraphViewViewportConsumers?.() === false) {
    return;
  }

  pluginHost.setGraphViewViewportState(createGraphViewViewportState({
    globalScale,
    graph,
    graphMode,
    nodes: [...nodes],
    timelineActive,
  }));
}
