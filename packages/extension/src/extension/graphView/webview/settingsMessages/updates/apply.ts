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

function getNextDisabledFilterPatterns(
  currentPatterns: readonly string[],
  pattern: string,
  enabled: boolean,
): string[] {
  const nextPatterns = new Set(currentPatterns);
  if (enabled) {
    nextPatterns.delete(pattern);
  } else {
    nextPatterns.add(pattern);
  }

  return Array.from(nextPatterns);
}

function getGroupDisabledFilterPatterns(
  source: 'custom' | 'plugin',
  enabled: boolean,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): string[] {
  if (enabled) {
    return [];
  }

  return source === 'custom'
    ? [...state.filterPatterns]
    : handlers.getPluginFilterPatterns();
}

function sendFilterPatternsUpdated(
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
  overrides: Partial<{
    disabledCustomPatterns: string[];
    disabledPluginPatterns: string[];
  }> = {},
): void {
  handlers.sendMessage({
    type: 'FILTER_PATTERNS_UPDATED',
    payload: {
      patterns: state.filterPatterns,
      pluginPatterns: handlers.getPluginFilterPatterns(),
      pluginPatternGroups: handlers.getPluginFilterGroups(),
      disabledCustomPatterns: overrides.disabledCustomPatterns
        ?? handlers.getConfig('disabledCustomFilterPatterns', []),
      disabledPluginPatterns: overrides.disabledPluginPatterns
        ?? handlers.getConfig('disabledPluginFilterPatterns', []),
    },
  });
}

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

  if (message.type === 'UPDATE_FILTER_PATTERN_STATE') {
    const key = message.payload.source === 'custom'
      ? 'disabledCustomFilterPatterns'
      : 'disabledPluginFilterPatterns';
    const disabledPatterns = getNextDisabledFilterPatterns(
      handlers.getConfig<string[]>(key, []),
      message.payload.pattern,
      message.payload.enabled,
    );
    await handlers.updateConfig(key, disabledPatterns);
    sendFilterPatternsUpdated(state, handlers, {
      [message.payload.source === 'custom' ? 'disabledCustomPatterns' : 'disabledPluginPatterns']:
        disabledPatterns,
    });
    await handlers.analyzeAndSendData();
    return true;
  }

  if (message.type === 'UPDATE_FILTER_PATTERN_GROUP_STATE') {
    const key = message.payload.source === 'custom'
      ? 'disabledCustomFilterPatterns'
      : 'disabledPluginFilterPatterns';
    const disabledPatterns = getGroupDisabledFilterPatterns(
      message.payload.source,
      message.payload.enabled,
      state,
      handlers,
    );
    await handlers.updateConfig(key, disabledPatterns);
    sendFilterPatternsUpdated(state, handlers, {
      [message.payload.source === 'custom' ? 'disabledCustomPatterns' : 'disabledPluginPatterns']:
        disabledPatterns,
    });
    await handlers.analyzeAndSendData();
    return true;
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
