import type { WebviewPluginHost } from '../../../../pluginHost/manager';
import type { FGNode } from '../../model/build';
import { createGraphViewViewportState, type GraphViewport2dControls } from './state';

export function publishPluginGraphViewViewportState({
  globalScale,
  graph,
  nodes,
  pluginHost,
}: {
  globalScale: number;
  graph: GraphViewport2dControls | undefined;
  nodes: readonly FGNode[];
  pluginHost: WebviewPluginHost | undefined;
}): void {
  if (!pluginHost || pluginHost.hasGraphViewViewportConsumers?.() === false) return;

  pluginHost.setGraphViewViewportState(createGraphViewViewportState({
    globalScale,
    graph,
    nodes: [...nodes],
  }));
}
