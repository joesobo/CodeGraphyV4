import type { IGraphData } from '../../../../shared/graph/contracts';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';

export type GraphDataUpdatedMessage = Extract<
  ExtensionToWebviewMessage,
  { type: 'GRAPH_DATA_UPDATED' }
>;
export type GraphNodeMetricsUpdateMessage = Extract<
  ExtensionToWebviewMessage,
  { type: 'GRAPH_NODE_METRICS_UPDATED' }
>;
export type GraphNodeMetricsUpdate = GraphNodeMetricsUpdateMessage['payload']['nodes'][number];
export type AppBootstrapCompleteMessage = Extract<
  ExtensionToWebviewMessage,
  { type: 'APP_BOOTSTRAP_COMPLETE' }
>;
export type GraphNode = IGraphData['nodes'][number];
