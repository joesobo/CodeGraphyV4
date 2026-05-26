import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from '../router';
import { applyDirectSettingsUpdateMessage } from './apply/direct';
import {
  applyFilterPatternGroupMessage,
  applyFilterPatternStateMessage,
} from './apply/filterPatternState';
import { applyResetAllSettingsMessage } from './apply/reset';

export async function applySettingsUpdateMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (await applyResetAllSettingsMessage(message, handlers)) {
    return true;
  }

  if (await applyFilterPatternStateMessage(message, state, handlers)) {
    return true;
  }

  if (await applyFilterPatternGroupMessage(message, state, handlers)) {
    return true;
  }

  return applyDirectSettingsUpdateMessage(message, state, handlers);
}
