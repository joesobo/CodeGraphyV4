import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from './router';

type SettingsUpdateConfigKey =
  | 'showOrphans'
  | 'bidirectionalEdges'
  | 'maxFiles';

function getSimpleSettingsUpdateConfig(
  message: WebviewToExtensionMessage,
): { key: SettingsUpdateConfigKey; value: unknown } | undefined {
  switch (message.type) {
    case 'UPDATE_SHOW_ORPHANS':
      return { key: 'showOrphans', value: message.payload.showOrphans };
    case 'UPDATE_BIDIRECTIONAL_MODE':
      return { key: 'bidirectionalEdges', value: message.payload.bidirectionalMode };
    case 'UPDATE_MAX_FILES':
      return { key: 'maxFiles', value: message.payload.maxFiles };
    default:
      return undefined;
  }
}

async function applySimpleSettingsUpdate(
  message: WebviewToExtensionMessage,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  const update = getSimpleSettingsUpdateConfig(message);
  if (!update) {
    return false;
  }

  await handlers.updateConfig(update.key, update.value);
  return true;
}

async function applyFilterPatternsUpdate(
  message: Extract<WebviewToExtensionMessage, { type: 'UPDATE_FILTER_PATTERNS' }>,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  state.filterPatterns = message.payload.patterns;
  await handlers.updateConfig('filterPatterns', state.filterPatterns);
  handlers.sendMessage({
    type: 'FILTER_PATTERNS_UPDATED',
    payload: {
      patterns: state.filterPatterns,
      pluginPatterns: handlers.getPluginFilterPatterns(),
    },
  });
  return true;
}

async function applyShowLabelsUpdate(
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

function getUpdatedConfigMap(
  handlers: GraphViewSettingsMessageHandlers,
  key: 'nodeVisibility' | 'edgeVisibility' | 'nodeColors' | 'edgeColors',
  entryKey: string,
  value: boolean | string,
): Record<string, boolean | string> {
  return {
    ...handlers.getConfig<Record<string, boolean | string>>(key, {}),
    [entryKey]: value,
  };
}

async function applyGraphControlsUpdate(
  key: 'nodeVisibility' | 'edgeVisibility' | 'nodeColors' | 'edgeColors',
  entryKey: string,
  value: boolean | string,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  await handlers.updateConfig(key, getUpdatedConfigMap(handlers, key, entryKey, value));
  handlers.sendGraphControls();
  return true;
}

async function applyPluginOrderUpdate(
  message: Extract<WebviewToExtensionMessage, { type: 'UPDATE_PLUGIN_ORDER' }>,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  await handlers.updateConfig('pluginOrder', message.payload.pluginIds);
  await handlers.reprocessPluginFiles(message.payload.pluginIds);
  return true;
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

  if (message.type === 'UPDATE_NODE_VISIBILITY') {
    return applyGraphControlsUpdate(
      'nodeVisibility',
      message.payload.nodeType,
      message.payload.visible,
      handlers,
    );
  }

  if (message.type === 'UPDATE_EDGE_VISIBILITY') {
    return applyGraphControlsUpdate(
      'edgeVisibility',
      message.payload.edgeKind,
      message.payload.visible,
      handlers,
    );
  }

  if (message.type === 'UPDATE_PLUGIN_ORDER') {
    return applyPluginOrderUpdate(message, handlers);
  }

  if (message.type === 'UPDATE_NODE_COLOR') {
    return applyGraphControlsUpdate(
      'nodeColors',
      message.payload.nodeType,
      message.payload.color,
      handlers,
    );
  }

  if (message.type === 'UPDATE_EDGE_COLOR') {
    return applyGraphControlsUpdate(
      'edgeColors',
      message.payload.edgeKind,
      message.payload.color,
      handlers,
    );
  }

  return false;
}
