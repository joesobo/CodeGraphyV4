import type { IGraphData } from '../../../../../shared/graph/contracts';
import type {
  GraphViewAnalysisExecutionHandlers,
} from '../../execution';

export function publishRawGraphUpdate(
  handlers: GraphViewAnalysisExecutionHandlers,
  rawGraphData: IGraphData,
): void {
  handlers.setRawGraphData(rawGraphData);
  handlers.updateViewContext();
  handlers.applyViewTransform();
  handlers.computeMergedGroups();
  handlers.sendGroupsUpdated();
}

export function publishStaticGraphMessages(handlers: GraphViewAnalysisExecutionHandlers): void {
  handlers.sendDepthState();
  handlers.sendPluginStatuses();
  handlers.sendDecorations();
  handlers.sendPluginWebviewInjections?.();
}

export function publishGraphDataMessage(
  handlers: GraphViewAnalysisExecutionHandlers,
  graphData: IGraphData,
): void {
  handlers.sendGraphDataUpdated(graphData);
}
