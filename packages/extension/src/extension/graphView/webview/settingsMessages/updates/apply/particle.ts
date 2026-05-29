import type { WebviewToExtensionMessage } from '../../../../../../shared/protocol/webviewToExtension';
import type { GraphViewSettingsMessageHandlers } from '../../router';

export async function applyParticleSettingMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (message.type !== 'UPDATE_PARTICLE_SETTING') {
    return false;
  }

  await handlers.updateConfig(message.payload.key, message.payload.value);
  return true;
}
