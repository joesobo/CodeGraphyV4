import type { IGraphData } from '../../shared/types';

interface GraphViewAnalyzerLike {
  rebuildGraph(
    disabledRules: Set<string>,
    disabledPlugins: Set<string>,
    showOrphans: boolean,
  ): IGraphData;
  getPluginStatuses(
    disabledRules: Set<string>,
    disabledPlugins: Set<string>,
  ): unknown[];
  registry: {
    notifyGraphRebuild(graphData: IGraphData): void;
  };
}

interface GraphViewRebuildState {
  _analyzer: GraphViewAnalyzerLike | undefined;
  _disabledRules: Set<string>;
  _disabledPlugins: Set<string>;
  _rawGraphData: IGraphData;
  _graphData: IGraphData;
}

interface RebuildGraphViewDataDependencies {
  getShowOrphans: () => boolean;
  updateViewContext: () => void;
  applyViewTransform: () => void;
  sendAvailableViews: () => void;
  sendPluginStatuses: () => void;
  sendDecorations: () => void;
  sendMessage: (message: unknown) => void;
}

interface SmartRebuildGraphViewDependencies {
  shouldRebuild: (statuses: unknown[], kind: 'rule' | 'plugin', id: string) => boolean;
  rebuildAndSend: () => void;
  sendMessage: (message: unknown) => void;
}

export function rebuildGraphViewData(
  state: GraphViewRebuildState,
  {
    getShowOrphans,
    updateViewContext,
    applyViewTransform,
    sendAvailableViews,
    sendPluginStatuses,
    sendDecorations,
    sendMessage,
  }: RebuildGraphViewDataDependencies,
): void {
  if (!state._analyzer) return;

  state._rawGraphData = state._analyzer.rebuildGraph(
    state._disabledRules,
    state._disabledPlugins,
    getShowOrphans(),
  );
  updateViewContext();
  applyViewTransform();
  sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: state._graphData });
  sendAvailableViews();
  sendPluginStatuses();
  sendDecorations();
  state._analyzer.registry.notifyGraphRebuild(state._graphData);
}

export function smartRebuildGraphView(
  state: Pick<GraphViewRebuildState, '_analyzer' | '_disabledRules' | '_disabledPlugins'>,
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
    state._disabledRules,
    state._disabledPlugins,
  );
  if (shouldRebuild(statuses, kind, id)) {
    rebuildAndSend();
    return;
  }

  sendMessage({ type: 'PLUGINS_UPDATED', payload: { plugins: statuses } });
}
