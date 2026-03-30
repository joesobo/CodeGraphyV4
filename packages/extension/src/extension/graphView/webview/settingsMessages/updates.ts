import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from './router';

export async function applySettingsUpdateMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'RESET_ALL_SETTINGS':
      await handlers.resetAllSettings();
      return true;

    case 'UPDATE_FILTER_PATTERNS':
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

    case 'UPDATE_SHOW_ORPHANS':
      await handlers.updateConfig('showOrphans', message.payload.showOrphans);
      return true;

    case 'UPDATE_BIDIRECTIONAL_MODE':
      await handlers.updateConfig('bidirectionalEdges', message.payload.bidirectionalMode);
      return true;

    case 'UPDATE_PARTICLE_SETTING':
      await handlers.updateConfig(message.payload.key, message.payload.value);
      return true;

    case 'UPDATE_SHOW_LABELS':
      await handlers.updateConfig('showLabels', message.payload.showLabels);
      handlers.sendMessage({
        type: 'SHOW_LABELS_UPDATED',
        payload: { showLabels: message.payload.showLabels },
      });
      return true;

    case 'UPDATE_MAX_FILES':
      await handlers.updateConfig('maxFiles', message.payload.maxFiles);
      return true;

    default:
      return false;
  }
}
