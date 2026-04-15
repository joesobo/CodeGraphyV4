import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import type { GraphViewSettingsMessageHandlers } from '../router';

export async function applyShowLabelsUpdate(
  message: Extract<WebviewToExtensionMessage, { type: 'UPDATE_SHOW_LABELS' }>,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  await handlers.updateConfig('showLabels', message.payload.showLabels);
  handlers.sendMessage({
    type: 'SHOW_LABELS_UPDATED',
    payload: { showLabels: message.payload.showLabels },
  });
  return true;
}
