import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import type { GraphViewCommandHandlers } from './dispatch';

export async function applyGraphModeCommand(
  message: WebviewToExtensionMessage,
  handlers: GraphViewCommandHandlers,
): Promise<boolean> {
  if (message.type === 'UPDATE_DEPTH_MODE') {
    await handlers.setDepthMode?.(message.payload.depthMode);
    return true;
  }

  if (message.type === 'CHANGE_DEPTH_LIMIT') {
    await handlers.setDepthLimit(message.payload.depthLimit);
    return true;
  }

  if (message.type === 'UPDATE_DAG_MODE') {
    await handlers.updateDagMode(message.payload.dagMode);
    return true;
  }

  if (message.type === 'UPDATE_NODE_SIZE_MODE') {
    await handlers.updateNodeSizeMode(message.payload.nodeSizeMode);
    return true;
  }

  return false;
}
