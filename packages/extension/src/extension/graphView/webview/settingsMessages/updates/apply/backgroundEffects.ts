import type { WebviewToExtensionMessage } from '../../../../../../shared/protocol/webviewToExtension';
import { normalizeBackgroundEffectsSettings } from '../../../../../../shared/settings/backgroundEffects';
import type { GraphViewSettingsMessageHandlers } from '../../router';

export async function applyBackgroundEffectsMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (message.type !== 'UPDATE_BACKGROUND_EFFECTS') {
    return false;
  }

  const backgroundEffects = normalizeBackgroundEffectsSettings(message.payload.backgroundEffects);
  await handlers.updateConfig('backgroundEffects', backgroundEffects);
  handlers.sendMessage({
    type: 'BACKGROUND_EFFECTS_UPDATED',
    payload: { backgroundEffects },
  });
  return true;
}
