import type { IGraphData } from '../../../shared/graph/types';
import type { IViewContext } from '../../../core/views/contracts';

interface GraphViewSelectionState {
  _depthMode?: boolean;
  _graphData: IGraphData;
  _viewContext: IViewContext;
}

interface ChangeGraphViewViewDependencies {
  persistDepthMode: (depthMode: boolean) => Promise<void>;
  applyViewTransform: () => void;
  sendMessage: (message: unknown) => void;
}

interface SetGraphViewFocusDependencies {
  applyViewTransform: () => void;
  sendMessage: (message: unknown) => void;
}

interface SetGraphViewDepthLimitDependencies {
  persistDepthLimit: (depthLimit: number) => Promise<void>;
  sendMessage: (message: unknown) => void;
  applyViewTransform: () => void;
}

export async function changeGraphViewView(
  state: GraphViewSelectionState,
  viewId: string,
  {
    persistDepthMode,
    applyViewTransform,
    sendMessage,
  }: ChangeGraphViewViewDependencies,
): Promise<void> {
  const nextDepthMode = viewId === 'codegraphy.depth-graph';
  state._depthMode = nextDepthMode;
  await persistDepthMode(nextDepthMode);
  applyViewTransform();
  sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: state._graphData });
}

export function setGraphViewFocusedFile(
  state: GraphViewSelectionState,
  filePath: string | undefined,
  {
    applyViewTransform,
    sendMessage,
  }: SetGraphViewFocusDependencies,
): void {
  const previousFocusedFile = state._viewContext.focusedFile;
  state._viewContext.focusedFile = filePath;

  if (previousFocusedFile !== filePath) {
    sendMessage({
      type: 'ACTIVE_FILE_UPDATED',
      payload: { filePath },
    });
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
