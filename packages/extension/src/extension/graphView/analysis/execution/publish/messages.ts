import type { IGraphData } from '../../../../../shared/graph/contracts';
import { diffGraphData } from '@codegraphy-dev/core';
import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisExecutionState,
} from '../../execution';
import { doGraphViewGroupsNeedRecompute } from './groupInputs';
import type { GraphPublicationPlan } from './plan';

export function publishRawGraphUpdate(
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
  rawGraphData: IGraphData,
  plan: GraphPublicationPlan,
): void {
  if (plan.reuseCurrentGraphPublication) {
    return;
  }

  handlers.setRawGraphData(rawGraphData);
  handlers.updateViewContext();
  handlers.applyViewTransform();
  publishGraphGroupsIfNeeded(state, handlers, rawGraphData, plan.currentRawGraphData);
}

function publishGraphGroupsIfNeeded(
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
  rawGraphData: IGraphData,
  currentRawGraphData: IGraphData | undefined,
): void {
  const canSkipGroupPublication = state.mode === 'incremental'
    && currentRawGraphData
    && !doGraphViewGroupsNeedRecompute(currentRawGraphData, rawGraphData);

  if (canSkipGroupPublication) {
    return;
  }

  handlers.computeMergedGroups();
  handlers.sendGroupsUpdated();
}

export function publishStaticGraphMessages(handlers: GraphViewAnalysisExecutionHandlers): void {
  handlers.sendDepthState();
  handlers.sendPluginStatuses();
  handlers.sendDecorations();
  handlers.sendContextMenuItems();
  handlers.sendPluginExporters?.();
  handlers.sendPluginToolbarActions?.();
  handlers.sendGraphViewContributionStatuses?.();
  handlers.sendPluginWebviewInjections?.();
}

export function publishGraphDataMessage(
  handlers: GraphViewAnalysisExecutionHandlers,
  graphData: IGraphData,
  plan: GraphPublicationPlan,
): void {
  if (plan.reuseCurrentGraphPublication) {
    return;
  }

  if (plan.shouldSendMetricPatch && plan.metricOnlyUpdate) {
    handlers.sendGraphNodeMetricsUpdated?.(plan.metricOnlyUpdate);
    return;
  }

  if (plan.shouldSendGraphPatch && plan.currentGraphData && handlers.sendGraphDataPatched) {
    handlers.sendGraphDataPatched(diffGraphData(plan.currentGraphData, graphData));
    return;
  }

  handlers.sendGraphDataUpdated(graphData);
}
