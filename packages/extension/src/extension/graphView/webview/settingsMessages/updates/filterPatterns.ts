import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from '../router';

export async function applyFilterPatternsUpdate(
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
