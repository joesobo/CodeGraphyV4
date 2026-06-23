import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IGraphNodeMetricsUpdate } from '../../../../../shared/protocol/extensionToWebview';
import type { CodeGraphyIndexFreshness } from '../../../../repoSettings/freshness';
import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisExecutionState,
} from '../../execution';
import { hasChangedNodeMetricDifference } from './metrics/changedPaths';
import { createMetricOnlyGraphUpdate } from './metrics/patch';
import { areGraphDataPayloadsEqual } from './equality/payload';

export interface GraphPublicationPlan {
  currentRawGraphData: IGraphData | undefined;
  metricOnlyUpdate: IGraphNodeMetricsUpdate[] | undefined;
  reuseCurrentGraphPublication: boolean;
  shouldSendMetricPatch: boolean;
}

function canReuseCurrentGraphPublication(
  state: GraphViewAnalysisExecutionState,
  currentRawGraphData: IGraphData | undefined,
  rawGraphData: IGraphData,
  actualHasIndex: boolean,
  freshness: CodeGraphyIndexFreshness,
): boolean {
  if (state.mode !== 'incremental' || !actualHasIndex || freshness !== 'fresh') {
    return false;
  }

  return currentRawGraphData
    ? !hasChangedNodeMetricDifference(currentRawGraphData, rawGraphData, state.changedFilePaths)
      && areGraphDataPayloadsEqual(currentRawGraphData, rawGraphData)
    : false;
}

export function createGraphPublicationPlan(
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
  rawGraphData: IGraphData,
  actualHasIndex: boolean,
  freshness: CodeGraphyIndexFreshness,
): GraphPublicationPlan {
  const currentRawGraphData = handlers.getRawGraphData?.();
  const metricOnlyUpdate = createMetricOnlyGraphUpdate(
    currentRawGraphData,
    rawGraphData,
    state.changedFilePaths,
  );

  return {
    currentRawGraphData,
    metricOnlyUpdate,
    reuseCurrentGraphPublication: canReuseCurrentGraphPublication(
      state,
      currentRawGraphData,
      rawGraphData,
      actualHasIndex,
      freshness,
    ),
    shouldSendMetricPatch: metricOnlyUpdate !== undefined
      && handlers.sendGraphNodeMetricsUpdated !== undefined,
  };
}
