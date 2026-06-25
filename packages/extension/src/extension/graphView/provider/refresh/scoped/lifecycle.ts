import type { IGraphData } from '../../../../../shared/graph/contracts';
import { createGraphViewIndexProgressCoalescer } from '../../../analysis/execution/progress';
import type {
  GraphViewProviderRefreshMethodsSource,
  GraphViewScopedRefreshProgress,
  ScopedRefreshLifecycle,
} from '../contracts';
import { sendRefreshState } from '../run';

export function createScopedRefreshLifecycle(): ScopedRefreshLifecycle {
  let scopedRefreshController: AbortController | undefined;

  return {
    setController(controller: AbortController): void {
      scopedRefreshController = controller;
    },
    clearController(controller: AbortController): void {
      if (scopedRefreshController === controller) {
        scopedRefreshController = undefined;
      }
    },
    abort(): void {
      scopedRefreshController?.abort();
    },
  };
}

export async function runScopedRefreshRequest(
  source: GraphViewProviderRefreshMethodsSource,
  runRefresh: (
    signal: AbortSignal,
    onProgress: (progress: GraphViewScopedRefreshProgress) => void,
  ) => Promise<IGraphData>,
  lifecycle: Pick<ScopedRefreshLifecycle, 'setController' | 'clearController'>,
): Promise<IGraphData | undefined> {
  source._analysisController?.abort();
  const controller = new AbortController();
  source._analysisController = controller;
  lifecycle.setController(controller);
  const requestId = ++source._analysisRequestId;

  const sendProgress = createGraphViewIndexProgressCoalescer((progress: GraphViewScopedRefreshProgress) => {
    if (!isScopedRefreshStale(source, controller.signal, requestId)) {
      source._sendMessage({ type: 'GRAPH_INDEX_PROGRESS', payload: progress });
    }
  });

  try {
    const graphData = await runRefresh(controller.signal, sendProgress);
    return isScopedRefreshStale(source, controller.signal, requestId) ? undefined : graphData;
  } catch (error) {
    if (!isScopedRefreshStale(source, controller.signal, requestId)) {
      throw error;
    }
    return undefined;
  } finally {
    lifecycle.clearController(controller);
    if (source._analysisController === controller) {
      source._analysisController = undefined;
    }
  }
}

export function publishScopedRefreshGraphData(
  source: GraphViewProviderRefreshMethodsSource,
  graphData: IGraphData,
): void {
  source._rawGraphData = graphData;
  source._updateViewContext();
  source._applyViewTransform();
  source._computeMergedGroups();
  source._sendGroupsUpdated();
  source._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: source._graphData });
  source._sendDepthState();
  source._sendGraphControls?.();
  source._sendPluginStatuses();
  source._sendDecorations();
  source._analyzer?.registry.notifyGraphRebuild(source._graphData, source._disabledPlugins);
}

export function publishGraphDataIfPresent(
  source: GraphViewProviderRefreshMethodsSource,
  graphData: IGraphData | undefined,
): void {
  if (!graphData) {
    return;
  }

  publishScopedRefreshGraphData(source, graphData);
  sendRefreshState(source);
}

function isScopedRefreshStale(
  source: GraphViewProviderRefreshMethodsSource,
  signal: AbortSignal,
  requestId: number,
): boolean {
  return signal.aborted || source._analysisRequestId !== requestId;
}
