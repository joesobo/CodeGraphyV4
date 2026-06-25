import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { ExtensionToWebviewMessage } from '../../../../../shared/protocol/extensionToWebview';
import type { GraphViewProviderAnalysisHandlers } from '../../../analysis/lifecycle';
import { sendGraphControlsUpdated } from '../../../controls/send';
import type { GraphViewProviderAnalysisMethodsSource } from '../methods';

type GraphNodeMetricUpdates = Parameters<NonNullable<GraphViewProviderAnalysisHandlers['sendGraphNodeMetricsUpdated']>>[0];
type GraphIndexStatusUpdated = GraphViewProviderAnalysisHandlers['sendGraphIndexStatusUpdated'];

export function sendGraphDataUpdated(
  source: GraphViewProviderAnalysisMethodsSource,
  graphData: IGraphData,
): void {
  sendGraphControlsUpdated(
    source._rawGraphData,
    source._analyzer,
    (message: ExtensionToWebviewMessage) => source._sendMessage(message),
    undefined,
    source._disabledPlugins,
  );
  source._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: graphData });
}

export function sendGraphNodeMetricsUpdated(
  source: GraphViewProviderAnalysisMethodsSource,
  updates: GraphNodeMetricUpdates,
): void {
  source._sendMessage({
    type: 'GRAPH_NODE_METRICS_UPDATED',
    payload: { nodes: updates },
  });
}

export const sendGraphIndexStatusUpdated: (
  source: GraphViewProviderAnalysisMethodsSource,
  ...args: Parameters<GraphIndexStatusUpdated>
) => void = (source, hasIndex, freshness, detail) => {
  source._sendMessage({
    type: 'GRAPH_INDEX_STATUS_UPDATED',
    payload: { hasIndex, freshness, detail },
  });
};
