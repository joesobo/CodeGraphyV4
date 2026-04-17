import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from '../router';
import { applySimpleSettingsUpdate } from './simple';
import { applyFilterPatternsUpdate } from './filterPatterns';
import { applyShowLabelsUpdate } from './labels';
import { applyPluginOrderUpdate } from './pluginOrder';
import { applyGraphControlMessage } from './controls';

export async function applySettingsUpdateMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (message.type === 'RESET_ALL_SETTINGS') {
    await handlers.resetAllSettings();
    return true;
  }

  if (message.type === 'UPDATE_FILTER_PATTERNS') {
    return applyFilterPatternsUpdate(message, state, handlers);
  }

  if (await applySimpleSettingsUpdate(message, handlers)) {
    return true;
  }

  if (message.type === 'UPDATE_PARTICLE_SETTING') {
    await handlers.updateConfig(message.payload.key, message.payload.value);
    return true;
  }

  if (message.type === 'UPDATE_SHOW_LABELS') {
    return applyShowLabelsUpdate(message, handlers);
  }

  if (message.type === 'UPDATE_PLUGIN_ORDER') {
    return applyPluginOrderUpdate(message, handlers);
  }

  if (await applyGraphControlMessage(message, handlers)) {
    return true;
  }

  return false;
}
