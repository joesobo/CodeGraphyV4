import type { WebviewToExtensionMessage } from '../../../../../../shared/protocol/webviewToExtension';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from '../../router';
import {
  getDisabledFilterPatternConfigKey,
  getFilterPatternStateOverrideKey,
  getGroupDisabledFilterPatterns,
  getNextDisabledFilterPatterns,
} from './filterPatternKeys';
import { sendFilterPatternsUpdated } from './filterPatternNotification';

export async function applyFilterPatternStateMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (message.type !== 'UPDATE_FILTER_PATTERN_STATE') {
    return false;
  }

  const key = getDisabledFilterPatternConfigKey(message.payload.source);
  const disabledPatterns = getNextDisabledFilterPatterns(
    handlers.getConfig<string[]>(key, []),
    message.payload.pattern,
    message.payload.enabled,
  );
  await handlers.updateConfig(key, disabledPatterns);
  sendFilterPatternsUpdated(state, handlers, {
    [getFilterPatternStateOverrideKey(message.payload.source)]: disabledPatterns,
  });
  return true;
}

export async function applyFilterPatternGroupMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (message.type !== 'UPDATE_FILTER_PATTERN_GROUP_STATE') {
    return false;
  }

  const key = getDisabledFilterPatternConfigKey(message.payload.source);
  const disabledPatterns = getGroupDisabledFilterPatterns(
    message.payload.source,
    message.payload.enabled,
    state,
    handlers,
  );
  await handlers.updateConfig(key, disabledPatterns);
  sendFilterPatternsUpdated(state, handlers, {
    [getFilterPatternStateOverrideKey(message.payload.source)]: disabledPatterns,
  });
  return true;
}
