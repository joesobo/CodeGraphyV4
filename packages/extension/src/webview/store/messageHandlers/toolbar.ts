import type { IHandlerContext } from '../messageTypes';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';

export function handleToggleDepthMode(
  _message: ExtensionToWebviewMessage,
  ctx: IHandlerContext,
): void {
  const { depthMode, graphHasIndex } = ctx.getState();
  if (!graphHasIndex) {
    return;
  }

  ctx.postMessage({
    type: 'UPDATE_DEPTH_MODE',
    payload: {
      depthMode: !depthMode,
    },
  });
}
