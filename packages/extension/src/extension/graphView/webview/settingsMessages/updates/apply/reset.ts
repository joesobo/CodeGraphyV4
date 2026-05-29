import type { WebviewToExtensionMessage } from '../../../../../../shared/protocol/webviewToExtension';
import type { GraphViewSettingsMessageHandlers } from '../../router';

export async function applyResetAllSettingsMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (message.type !== 'RESET_ALL_SETTINGS') {
    return false;
  }

  await handlers.resetAllSettings();
  return true;
}
