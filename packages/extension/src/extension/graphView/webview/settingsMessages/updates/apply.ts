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

function getDisabledFilterPatternConfigKey(
  source: 'custom' | 'plugin',
): 'disabledCustomFilterPatterns' | 'disabledPluginFilterPatterns' {
  return source === 'custom'
    ? 'disabledCustomFilterPatterns'
    : 'disabledPluginFilterPatterns';
}

function getFilterPatternStateOverrideKey(
  source: 'custom' | 'plugin',
): 'disabledCustomPatterns' | 'disabledPluginPatterns' {
  return source === 'custom'
    ? 'disabledCustomPatterns'
    : 'disabledPluginPatterns';
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

async function applyResetAllSettingsMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (message.type !== 'RESET_ALL_SETTINGS') {
    return false;
  }

  await handlers.resetAllSettings();
  return true;
}

async function applyFilterPatternStateMessage(
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
  await handlers.analyzeAndSendData();
  return true;
}

async function applyFilterPatternGroupMessage(
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
  await handlers.analyzeAndSendData();
  return true;
}

async function applyParticleSettingMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (message.type !== 'UPDATE_PARTICLE_SETTING') {
    return false;
  }

  await handlers.updateConfig(message.payload.key, message.payload.value);
  return true;
}

async function applyDirectSettingsUpdateMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'UPDATE_FILTER_PATTERNS':
      return applyFilterPatternsUpdate(message, state, handlers);
    case 'UPDATE_SHOW_LABELS':
      return applyShowLabelsUpdate(message, handlers);
    case 'UPDATE_PLUGIN_ORDER':
      return applyPluginOrderUpdate(message, handlers);
    default:
      return false;
  }
}

const statefulSettingsMessageAppliers = [
  (
    message: WebviewToExtensionMessage,
    _state: GraphViewSettingsMessageState,
    handlers: GraphViewSettingsMessageHandlers,
  ) => applyResetAllSettingsMessage(message, handlers),
  applyFilterPatternStateMessage,
  applyFilterPatternGroupMessage,
] as const satisfies ReadonlyArray<(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
) => Promise<boolean>>;

const statelessSettingsMessageAppliers = [
  applySimpleSettingsUpdate,
  applyParticleSettingMessage,
  applyGraphControlMessage,
] as const satisfies ReadonlyArray<(
  message: WebviewToExtensionMessage,
  handlers: GraphViewSettingsMessageHandlers,
) => Promise<boolean>>;

export async function applySettingsUpdateMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  for (const applyMessage of statefulSettingsMessageAppliers) {
    if (await applyMessage(message, state, handlers)) {
      return true;
    }
  }

  if (await applyDirectSettingsUpdateMessage(message, state, handlers)) {
    return true;
  }

  for (const applyMessage of statelessSettingsMessageAppliers) {
    if (await applyMessage(message, handlers)) {
      return true;
    }
  }

  return false;
}
