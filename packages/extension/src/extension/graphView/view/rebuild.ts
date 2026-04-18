import type { IGraphData } from '../../../shared/graph/contracts';

interface GraphViewAnalyzerLike {
  rebuildGraph(
    disabledPlugins: Set<string>,
    showOrphans: boolean,
  ): IGraphData;
  registry: {
    notifyGraphRebuild(graphData: IGraphData): void;
  };
}

interface GraphViewRebuildState {
  _analyzer: GraphViewAnalyzerLike | undefined;
  _disabledPlugins: Set<string>;
  _rawGraphData: IGraphData;
  _graphData: IGraphData;
}

interface RebuildGraphViewDataDependencies {
  getShowOrphans: () => boolean;
  computeMergedGroups: () => void;
  sendGroupsUpdated: () => void;
  updateViewContext: () => void;
  applyViewTransform: () => void;
  sendDepthState: () => void;
  sendGraphControls: () => void;
  sendPluginStatuses: () => void;
  sendDecorations: () => void;
  sendMessage: (message: unknown) => void;
}

interface SmartRebuildGraphViewDependencies {
  rebuildAndSend: () => void;
}

export function rebuildGraphViewData(
  state: GraphViewRebuildState,
  {
    getShowOrphans,
    computeMergedGroups,
    sendGroupsUpdated,
    updateViewContext,
    applyViewTransform,
    sendDepthState,
    sendGraphControls,
    sendPluginStatuses,
    sendDecorations,
    sendMessage,
  }: RebuildGraphViewDataDependencies,
): void {
  if (!state._analyzer) return;

  state._rawGraphData = state._analyzer.rebuildGraph(
    state._disabledPlugins,
    getShowOrphans(),
  );
  computeMergedGroups();
  sendGroupsUpdated();
  updateViewContext();
  applyViewTransform();
  sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: state._graphData });
  sendDepthState();
  sendGraphControls();
  sendPluginStatuses();
  sendDecorations();
  state._analyzer.registry.notifyGraphRebuild(state._graphData);
}

export function smartRebuildGraphView(
  state: Pick<GraphViewRebuildState, '_analyzer' | '_disabledPlugins'>,
  _id: string,
  {
    rebuildAndSend,
  }: SmartRebuildGraphViewDependencies,
): void {
  if (!state._analyzer) return;
  rebuildAndSend();
}
