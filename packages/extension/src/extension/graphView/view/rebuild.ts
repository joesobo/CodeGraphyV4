import type { IGraphData } from '../../../shared/graph/types';
import type { IPluginStatus } from '../../../shared/plugins/status';

interface GraphViewAnalyzerLike {
  rebuildGraph(
    disabledSources: Set<string>,
    disabledPlugins: Set<string>,
    showOrphans: boolean,
  ): IGraphData;
  getPluginStatuses(
    disabledSources: Set<string>,
    disabledPlugins: Set<string>,
  ): readonly IPluginStatus[];
  registry: {
    notifyGraphRebuild(graphData: IGraphData): void;
  };
}

interface GraphViewRebuildState {
  _analyzer: GraphViewAnalyzerLike | undefined;
  _disabledSources: Set<string>;
  _disabledPlugins: Set<string>;
  _rawGraphData: IGraphData;
  _graphData: IGraphData;
}

interface RebuildGraphViewDataDependencies {
  getShowOrphans: () => boolean;
  updateViewContext: () => void;
  applyViewTransform: () => void;
  sendDepthState: () => void;
  sendPluginStatuses: () => void;
  sendDecorations: () => void;
  sendMessage: (message: unknown) => void;
}

interface SmartRebuildGraphViewDependencies {
  shouldRebuild: (statuses: readonly IPluginStatus[], kind: 'rule' | 'plugin', id: string) => boolean;
  rebuildAndSend: () => void;
  sendMessage: (message: unknown) => void;
}

export function rebuildGraphViewData(
  state: GraphViewRebuildState,
  {
    getShowOrphans,
    updateViewContext,
    applyViewTransform,
    sendDepthState,
    sendPluginStatuses,
    sendDecorations,
    sendMessage,
  }: RebuildGraphViewDataDependencies,
): void {
  if (!state._analyzer) return;

  state._rawGraphData = state._analyzer.rebuildGraph(
    state._disabledSources,
    state._disabledPlugins,
    getShowOrphans(),
  );
  updateViewContext();
  applyViewTransform();
  sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: state._graphData });
  sendDepthState();
  sendPluginStatuses();
  sendDecorations();
  state._analyzer.registry.notifyGraphRebuild(state._graphData);
}

export function smartRebuildGraphView(
  state: Pick<GraphViewRebuildState, '_analyzer' | '_disabledSources' | '_disabledPlugins'>,
  kind: 'rule' | 'plugin',
  id: string,
  {
    shouldRebuild,
    rebuildAndSend,
    sendMessage,
  }: SmartRebuildGraphViewDependencies,
): void {
  if (!state._analyzer) return;

  const statuses = state._analyzer.getPluginStatuses(
    state._disabledSources,
    state._disabledPlugins,
  );
  if (shouldRebuild(statuses, kind, id)) {
    rebuildAndSend();
    return;
  }

  sendMessage({ type: 'PLUGINS_UPDATED', payload: { plugins: statuses } });
}
