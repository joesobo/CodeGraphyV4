import type { IGraphData } from '../../../shared/graph/types';
import type { IViewContext } from '../../../core/views/contracts';

interface GraphViewSelectionState {
  _activeViewId: string;
  _depthMode?: boolean;
  _graphData: IGraphData;
  _viewContext: IViewContext;
}

interface GraphViewViewInfoLike {
  view: {
    id: string;
    recomputeOn?: readonly ('focusedFile' | 'depthLimit')[];
  };
}

function shouldRefreshActiveView(
  viewInfo: GraphViewViewInfoLike | undefined,
  dependency: 'focusedFile' | 'depthLimit',
): boolean {
  return Boolean(viewInfo?.view.recomputeOn?.includes(dependency));
}

interface ChangeGraphViewViewDependencies {
  isViewAvailable: (viewId: string, viewContext: IViewContext) => boolean;
  persistActiveViewId: (viewId: string) => Promise<void>;
  applyViewTransform: () => void;
  sendAvailableViews: () => void;
  sendMessage: (message: unknown) => void;
  logUnavailableView: (viewId: string) => void;
}

interface SetGraphViewFocusDependencies {
  getActiveViewInfo: (activeViewId: string) => GraphViewViewInfoLike | undefined;
  applyViewTransform: () => void;
  sendAvailableViews: () => void;
  sendMessage: (message: unknown) => void;
}

interface SetGraphViewDepthLimitDependencies {
  persistDepthLimit: (depthLimit: number) => Promise<void>;
  sendMessage: (message: unknown) => void;
  getActiveViewInfo: (activeViewId: string) => GraphViewViewInfoLike | undefined;
  applyViewTransform: () => void;
}

export async function changeGraphViewView(
  state: GraphViewSelectionState,
  viewId: string,
  {
    isViewAvailable,
    persistActiveViewId,
    applyViewTransform,
    sendAvailableViews,
    sendMessage,
    logUnavailableView,
  }: ChangeGraphViewViewDependencies,
): Promise<void> {
  if (!isViewAvailable(viewId, state._viewContext)) {
    logUnavailableView(viewId);
    return;
  }

  state._activeViewId = viewId;
  state._depthMode = viewId === 'codegraphy.depth-graph';
  await persistActiveViewId(viewId);
  applyViewTransform();
  sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: state._graphData });
  sendAvailableViews();
}

export function setGraphViewFocusedFile(
  state: GraphViewSelectionState,
  filePath: string | undefined,
  {
    getActiveViewInfo,
    applyViewTransform,
    sendAvailableViews,
    sendMessage,
  }: SetGraphViewFocusDependencies,
): void {
  const previousFocusedFile = state._viewContext.focusedFile;
  state._viewContext.focusedFile = filePath;

  if (previousFocusedFile !== filePath) {
    sendAvailableViews();
    sendMessage({
      type: 'ACTIVE_FILE_UPDATED',
      payload: { filePath },
    });
  }

  if (shouldRefreshActiveView(getActiveViewInfo(state._activeViewId), 'focusedFile')) {
    applyViewTransform();
    sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: state._graphData });
    return;
  }

  if (state._depthMode) {
    applyViewTransform();
    sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: state._graphData });
  }
}

export async function setGraphViewDepthLimit(
  state: GraphViewSelectionState,
  depthLimit: number,
  {
    persistDepthLimit,
    sendMessage,
    getActiveViewInfo,
    applyViewTransform,
  }: SetGraphViewDepthLimitDependencies,
): Promise<void> {
  const clampedDepthLimit = Math.max(1, Math.min(10, depthLimit));
  state._viewContext.depthLimit = clampedDepthLimit;

  await persistDepthLimit(clampedDepthLimit);
  sendMessage({
    type: 'DEPTH_LIMIT_UPDATED',
    payload: { depthLimit: clampedDepthLimit },
  });

  if (shouldRefreshActiveView(getActiveViewInfo(state._activeViewId), 'depthLimit')) {
    applyViewTransform();
    sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: state._graphData });
    return;
  }

  if (state._depthMode) {
    applyViewTransform();
    sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: state._graphData });
  }
}

export function getGraphViewDepthLimit(
  viewContext: IViewContext,
  defaultDepthLimit: number,
): number {
  return viewContext.depthLimit ?? defaultDepthLimit;
}
