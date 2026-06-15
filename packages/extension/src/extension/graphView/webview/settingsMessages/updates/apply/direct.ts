import type { WebviewToExtensionMessage } from '../../../../../../shared/protocol/webviewToExtension';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from '../../router';
import { applyGraphControlMessage } from '../controls';
import { applyFilterPatternsUpdate } from '../filterPatterns';
import { applyShowLabelsUpdate } from '../labels';
import { applySimpleSettingsUpdate } from '../simple';
import { applyParticleSettingMessage } from './particle';
import { applyPluginDataMessage } from './pluginData';

export async function applyDirectSettingsUpdateMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'UPDATE_FILTER_PATTERNS':
      return applyFilterPatternsUpdate(message, state, handlers);
    case 'UPDATE_SHOW_LABELS':
      return applyShowLabelsUpdate(message, handlers);
    default:
      return applyStatelessSettingsUpdateMessage(message, handlers);
  }
}

export async function applyStatelessSettingsUpdateMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (await applySimpleSettingsUpdate(message, handlers)) {
    return true;
  }

  if (await applyParticleSettingMessage(message, handlers)) {
    return true;
  }

  if (await applyPluginDataMessage(message, handlers)) {
    return true;
  }

  return applyGraphControlMessage(message, handlers);
}
