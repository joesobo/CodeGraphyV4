import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { ExtensionToWebviewMessage } from '../../../../../shared/protocol/extensionToWebview';
import type { GraphViewProviderAnalysisHandlers } from '../../../analysis/lifecycle';
import { sendGraphControlsUpdated } from '../../../controls/send';
import type { GraphViewProviderAnalysisMethodsSource } from '../methods';

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
  source._sendMessage({
    type: 'FILTER_ACCOUNTING_UPDATED',
    payload: {
      excludedFileCount: source._analyzer?.getFilterExcludedFileCount?.() ?? 0,
    },
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
