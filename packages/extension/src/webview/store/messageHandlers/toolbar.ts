import type { IHandlerContext, PartialState } from '../messageTypes';
import { DAG_MODE_CYCLE } from '../messageTypes';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';

export function handleCycleView(
  _message: ExtensionToWebviewMessage,
  ctx: IHandlerContext,
): void {
  const { activeViewId, graphHasIndex } = ctx.getState();
  if (!graphHasIndex) {
    return;
  }

  ctx.postMessage({
    type: 'CHANGE_VIEW',
    payload: {
      viewId: activeViewId === 'codegraphy.depth-graph'
        ? 'codegraphy.connections'
        : 'codegraphy.depth-graph',
    },
  });
}

export function handleCycleLayout(
  _message: ExtensionToWebviewMessage,
  ctx: IHandlerContext,
): void {
  const { dagMode } = ctx.getState();
  const idx = DAG_MODE_CYCLE.indexOf(dagMode);
  const nextMode = DAG_MODE_CYCLE[(idx + 1) % DAG_MODE_CYCLE.length];
  ctx.postMessage({ type: 'UPDATE_DAG_MODE', payload: { dagMode: nextMode } });
}

export function handleToggleDimension(
  _message: ExtensionToWebviewMessage,
  ctx: IHandlerContext,
): PartialState {
  const { graphMode } = ctx.getState();
  return { graphMode: graphMode === '2d' ? '3d' : '2d' };
}
